// Model provider: Anthropic direct (native Messages API, prompt-cached) when
// ANTHROPIC_API_KEY is set, otherwise OpenRouter. Both serve Claude models.
//
// The rest of the app talks in Anthropic block shapes; this module translates
// them both ways so tool-calling behavior is identical on both paths.
// Nothing here touches crisis handling — detectCrisis() runs before any call.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Bare Anthropic model ids used across the app → OpenRouter model slugs. */
const OPENROUTER_MODEL_MAP: Record<string, string> = {
  "claude-sonnet-5": "anthropic/claude-sonnet-4.5",
  "claude-sonnet-4-5": "anthropic/claude-sonnet-4.5",
  "claude-haiku-4-5": "anthropic/claude-haiku-4.5",
};

function toOpenRouterModel(model: string): string {
  if (model.includes("/")) return model;
  return OPENROUTER_MODEL_MAP[model] ?? `anthropic/${model}`;
}

export type LlmContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

export type LlmMessage = { role: "user" | "assistant"; content: string | LlmContentBlock[] };

export type LlmTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export type LlmResponse = {
  content: LlmContentBlock[];
  stop_reason: string | null;
  /** Which provider actually answered — useful for logs. */
  provider: "openrouter" | "anthropic";
  /**
   * Token counts for this single call (0 when the provider omits `usage`).
   * inputTokens is the TOTAL prompt (uncached + cache read + cache write); the
   * optional cache fields break out the cached part (native Anthropic path).
   */
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
};

export class LlmError extends Error {}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

/** Anthropic direct wins when its key is present; else OpenRouter. */
function gateway(
  model: string,
): { url: string; key: string; model: string; native?: boolean } | null {
  const anthropic = process.env["ANTHROPIC_API_KEY"];
  if (anthropic) return { url: ANTHROPIC_URL, key: anthropic, model, native: true };
  const openRouter = process.env["OPENROUTER_API_KEY"];
  return openRouter
    ? { url: OPENROUTER_URL, key: openRouter, model: toOpenRouterModel(model) }
    : null;
}

// --- OpenAI-compatible translation ----------------------------------------

/**
 * Anthropic's ephemeral prompt cache, reachable through OpenRouter by marking a
 * content part with `cache_control`. The system prompt is large and identical on
 * every turn of a conversation, so caching it means repeat calls pay the much
 * cheaper cache-read rate instead of full input price. No behaviour change.
 */
type CacheableTextPart = {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
};

type GatewayMessage =
  | { role: "system"; content: CacheableTextPart[] }
  | { role: "system" | "user" | "assistant"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls: {
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

function toGatewayMessages(system: string, messages: LlmMessage[]): GatewayMessage[] {
  const out: GatewayMessage[] = [
    {
      role: "system",
      // Static across the whole conversation -> cache it.
      content: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    },
  ];

  for (const message of messages) {
    if (typeof message.content === "string") {
      out.push({ role: message.role, content: message.content });
      continue;
    }

    const text = message.content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    const toolUses = message.content.filter(
      (
        block,
      ): block is { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
        block.type === "tool_use",
    );
    const toolResults = message.content.filter(
      (block): block is { type: "tool_result"; tool_use_id: string; content: string } =>
        block.type === "tool_result",
    );

    if (message.role === "assistant") {
      if (toolUses.length) {
        out.push({
          role: "assistant",
          content: text || null,
          tool_calls: toolUses.map((call) => ({
            id: call.id,
            type: "function" as const,
            function: { name: call.name, arguments: JSON.stringify(call.input ?? {}) },
          })),
        });
      } else {
        out.push({ role: "assistant", content: text });
      }
      continue;
    }

    // user role: tool results become dedicated tool messages
    if (toolResults.length) {
      for (const result of toolResults) {
        out.push({ role: "tool", tool_call_id: result.tool_use_id, content: result.content });
      }
      if (text) out.push({ role: "user", content: text });
      continue;
    }
    out.push({ role: "user", content: text });
  }

  return out;
}

function toGatewayTools(tools: LlmTool[]) {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

function parseOpenAiPayload(payload: unknown, provider: LlmResponse["provider"]): LlmResponse {
  const typed = payload as {
    choices?: {
      finish_reason?: string;
      message?: {
        content?: string | null;
        tool_calls?: { id: string; function?: { name?: string; arguments?: string } }[];
      };
    }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const choice = typed.choices?.[0];
  const blocks: LlmContentBlock[] = [];
  const text = choice?.message?.content;
  if (text) blocks.push({ type: "text", text });
  for (const call of choice?.message?.tool_calls ?? []) {
    let input: Record<string, unknown> = {};
    try {
      input = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
    } catch {
      input = {};
    }
    blocks.push({ type: "tool_use", id: call.id, name: call.function?.name ?? "", input });
  }

  const hasToolUse = blocks.some((block) => block.type === "tool_use");
  return {
    content: blocks,
    stop_reason: hasToolUse ? "tool_use" : (choice?.finish_reason ?? null),
    provider,
    usage: {
      inputTokens: typed.usage?.prompt_tokens ?? 0,
      outputTokens: typed.usage?.completion_tokens ?? 0,
    },
  };
}

async function callOpenRouter(
  gw: { url: string; key: string; model: string },
  model: string,
  maxTokens: number,
  system: string,
  messages: LlmMessage[],
  tools: LlmTool[],
): Promise<LlmResponse> {
  const response = await fetch(gw.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gw.key}`,
      "Content-Type": "application/json",
      "X-Title": "Calm AI",
    },
    body: JSON.stringify({
      model: gw.model,
      max_tokens: maxTokens,
      messages: toGatewayMessages(system, messages),
      ...(tools.length ? { tools: toGatewayTools(tools) } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new LlmError(`LLM gateway error ${response.status}: ${body.slice(0, 300)}`);
  }

  const payload = await response.json();
  return parseOpenAiPayload(payload, "openrouter");
}

// --- Streaming ---------------------------------------------------------
// Same OpenAI-compatible wire format as above, but reading the response body
// as an SSE stream (`data: {...}\n\n` lines, terminated by `data: [DONE]`) and
// emitting text as it arrives instead of waiting for the full completion.
// Tool-call deltas arrive fragmented (arguments streamed as partial JSON
// strings, keyed by `index`) and are accumulated here into the same
// LlmContentBlock[] shape callCompanionModel returns, so callers that already
// handle tool_use blocks don't need to know the difference.

type StreamToolCallAccumulator = { id: string; name: string; arguments: string };

async function* readSseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let separatorIndex: number;

      while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) yield trimmed.slice(5).trim();
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Consumes an OpenAI-compatible SSE stream, calling `onDelta` with each text
 * fragment as it arrives, and returns the fully-accumulated LlmResponse once
 * the stream ends (mirroring parseOpenAiPayload's shape).
 */
async function consumeOpenAiStream(
  response: Response,
  provider: LlmResponse["provider"],
  onDelta: (text: string) => void,
): Promise<LlmResponse> {
  if (!response.body) throw new LlmError("Streaming response had no body");

  let text = "";
  let finishReason: string | null = null;
  let inputTokens = 0;
  let outputTokens = 0;
  const toolCalls = new Map<number, StreamToolCallAccumulator>();

  for await (const data of readSseEvents(response.body)) {
    if (data === "[DONE]") break;
    let event: {
      choices?: {
        delta?: {
          content?: string | null;
          tool_calls?: {
            index: number;
            id?: string;
            function?: { name?: string; arguments?: string };
          }[];
        };
        finish_reason?: string | null;
      }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    try {
      event = JSON.parse(data);
    } catch {
      continue; // a stray keep-alive/comment line — ignore rather than fail the whole reply
    }

    const choice = event.choices?.[0];
    const delta = choice?.delta?.content;
    if (delta) {
      text += delta;
      onDelta(delta);
    }
    for (const call of choice?.delta?.tool_calls ?? []) {
      const existing = toolCalls.get(call.index) ?? { id: "", name: "", arguments: "" };
      if (call.id) existing.id = call.id;
      if (call.function?.name) existing.name = call.function.name;
      if (call.function?.arguments) existing.arguments += call.function.arguments;
      toolCalls.set(call.index, existing);
    }
    if (choice?.finish_reason) finishReason = choice.finish_reason;
    if (event.usage) {
      inputTokens = event.usage.prompt_tokens ?? inputTokens;
      outputTokens = event.usage.completion_tokens ?? outputTokens;
    }
  }

  const blocks: LlmContentBlock[] = [];
  if (text) blocks.push({ type: "text", text });
  for (const call of toolCalls.values()) {
    let input: Record<string, unknown> = {};
    try {
      input = call.arguments ? JSON.parse(call.arguments) : {};
    } catch {
      input = {};
    }
    blocks.push({ type: "tool_use", id: call.id, name: call.name, input });
  }

  return {
    content: blocks,
    stop_reason: toolCalls.size > 0 ? "tool_use" : finishReason,
    provider,
    usage: { inputTokens, outputTokens },
  };
}

async function streamOpenRouter(
  gw: { url: string; key: string; model: string },
  model: string,
  maxTokens: number,
  system: string,
  messages: LlmMessage[],
  tools: LlmTool[],
  onDelta: (text: string) => void,
): Promise<LlmResponse> {
  const response = await fetch(gw.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gw.key}`,
      "Content-Type": "application/json",
      "X-Title": "Calm AI",
    },
    body: JSON.stringify({
      model: gw.model,
      max_tokens: maxTokens,
      messages: toGatewayMessages(system, messages),
      stream: true,
      stream_options: { include_usage: true },
      ...(tools.length ? { tools: toGatewayTools(tools) } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new LlmError(`LLM gateway error ${response.status}: ${body.slice(0, 300)}`);
  }
  return consumeOpenAiStream(response, "openrouter", onDelta);
}

// --- Native Anthropic Messages API (prompt caching) ----------------------
// Anthropic's OpenAI-compatible endpoint ignores cache_control, so the large,
// identical prefix (system + tools) was billed at full price every turn. This
// path talks to /v1/messages and sets three breakpoints: system, last tool,
// and the last-but-one history message (so a growing chat reuses its prefix).

type CacheControl = { type: "ephemeral" };
type NativeBlock =
  | { type: "text"; text: string; cache_control?: CacheControl }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
      cache_control?: CacheControl;
    }
  | { type: "tool_result"; tool_use_id: string; content: string; cache_control?: CacheControl };
type NativeMessage = { role: "user" | "assistant"; content: NativeBlock[] };

const EPHEMERAL: CacheControl = { type: "ephemeral" };

export function toNativeMessages(messages: LlmMessage[]): NativeMessage[] {
  const out: NativeMessage[] = [];
  for (const message of messages) {
    const blocks: NativeBlock[] =
      typeof message.content === "string"
        ? [{ type: "text", text: message.content }]
        : message.content.map((b) => ({ ...b }));
    // Anthropic rejects empty text blocks; tool_result blocks must lead a user turn.
    const kept = blocks.filter((b) => b.type !== "text" || b.text.trim() !== "");
    if (message.role === "user") {
      kept.sort((a, b) => +(b.type === "tool_result") - +(a.type === "tool_result"));
    }
    if (kept.length) out.push({ role: message.role, content: kept });
  }
  // Third breakpoint: last-but-one message (the previous turn's tail).
  const prior = out[out.length - 2];
  if (prior) prior.content[prior.content.length - 1]!.cache_control = EPHEMERAL;
  return out;
}

export function buildNativeBody(
  model: string,
  maxTokens: number,
  system: string,
  messages: LlmMessage[],
  tools: LlmTool[],
  stream: boolean,
) {
  return {
    model,
    max_tokens: maxTokens,
    system: [{ type: "text", text: system, cache_control: EPHEMERAL }],
    messages: toNativeMessages(messages),
    ...(stream ? { stream: true } : {}),
    ...(tools.length
      ? {
          tools: tools.map((tool, i) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.input_schema,
            ...(i === tools.length - 1 ? { cache_control: EPHEMERAL } : {}),
          })),
        }
      : {}),
  };
}

type NativeUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

/** inputTokens = total prompt tokens (input + cache read + cache write). */
function nativeUsage(u: NativeUsage | undefined): LlmResponse["usage"] {
  const read = u?.cache_read_input_tokens ?? 0;
  const write = u?.cache_creation_input_tokens ?? 0;
  return {
    inputTokens: (u?.input_tokens ?? 0) + read + write,
    outputTokens: u?.output_tokens ?? 0,
    cacheReadTokens: read,
    cacheWriteTokens: write,
  };
}

async function postNative(gw: { url: string; key: string }, body: unknown): Promise<Response> {
  const response = await fetch(gw.url, {
    method: "POST",
    headers: {
      "x-api-key": gw.key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new LlmError(`LLM gateway error ${response.status}: ${text.slice(0, 300)}`);
  }
  return response;
}

async function callAnthropicNative(
  gw: { url: string; key: string; model: string },
  maxTokens: number,
  system: string,
  messages: LlmMessage[],
  tools: LlmTool[],
): Promise<LlmResponse> {
  const response = await postNative(
    gw,
    buildNativeBody(gw.model, maxTokens, system, messages, tools, false),
  );
  const payload = (await response.json()) as {
    content?: (
      | { type: "text"; text: string }
      | { type: "tool_use"; id: string; name: string; input?: Record<string, unknown> }
    )[];
    stop_reason?: string | null;
    usage?: NativeUsage;
  };
  const blocks: LlmContentBlock[] = [];
  for (const b of payload.content ?? []) {
    if (b.type === "text" && b.text) blocks.push({ type: "text", text: b.text });
    else if (b.type === "tool_use") {
      blocks.push({ type: "tool_use", id: b.id, name: b.name, input: b.input ?? {} });
    }
  }
  return {
    content: blocks,
    stop_reason: payload.stop_reason ?? null,
    provider: "anthropic",
    usage: nativeUsage(payload.usage),
  };
}

async function streamAnthropicNative(
  gw: { url: string; key: string; model: string },
  maxTokens: number,
  system: string,
  messages: LlmMessage[],
  tools: LlmTool[],
  onDelta: (text: string) => void,
): Promise<LlmResponse> {
  const response = await postNative(
    gw,
    buildNativeBody(gw.model, maxTokens, system, messages, tools, true),
  );
  if (!response.body) throw new LlmError("Streaming response had no body");

  // Content blocks keyed by event `index`.
  const acc = new Map<
    number,
    { type: "text" | "tool_use"; text: string; id: string; name: string; json: string }
  >();
  let stopReason: string | null = null;
  const usage: NativeUsage = {};

  for await (const data of readSseEvents(response.body)) {
    let ev: {
      type?: string;
      index?: number;
      message?: { usage?: NativeUsage };
      content_block?: { type?: string; id?: string; name?: string };
      delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string | null };
      usage?: NativeUsage;
      error?: { message?: string };
    };
    try {
      ev = JSON.parse(data);
    } catch {
      continue;
    }
    if (ev.type === "error") {
      throw new LlmError(
        `LLM gateway error 529: ${(ev.error?.message ?? "stream error").slice(0, 300)}`,
      );
    }
    if (ev.type === "message_start") Object.assign(usage, ev.message?.usage);
    else if (ev.type === "message_delta") {
      Object.assign(usage, ev.usage);
      if (ev.delta?.stop_reason) stopReason = ev.delta.stop_reason;
    } else if (ev.type === "content_block_start" && ev.index !== undefined) {
      const cb = ev.content_block;
      acc.set(ev.index, {
        type: cb?.type === "tool_use" ? "tool_use" : "text",
        text: "",
        id: cb?.id ?? "",
        name: cb?.name ?? "",
        json: "",
      });
    } else if (ev.type === "content_block_delta" && ev.index !== undefined) {
      const slot = acc.get(ev.index);
      if (!slot) continue;
      if (ev.delta?.type === "text_delta" && ev.delta.text) {
        slot.text += ev.delta.text;
        onDelta(ev.delta.text);
      } else if (ev.delta?.type === "input_json_delta" && ev.delta.partial_json) {
        slot.json += ev.delta.partial_json;
      }
    }
  }

  const blocks: LlmContentBlock[] = [];
  for (const [, slot] of [...acc.entries()].sort((a, b) => a[0] - b[0])) {
    if (slot.type === "text") {
      if (slot.text) blocks.push({ type: "text", text: slot.text });
      continue;
    }
    let input: Record<string, unknown> = {};
    try {
      input = slot.json ? JSON.parse(slot.json) : {};
    } catch {
      input = {};
    }
    blocks.push({ type: "tool_use", id: slot.id, name: slot.name, input });
  }
  return { content: blocks, stop_reason: stopReason, provider: "anthropic", usage: nativeUsage(usage) };
}

/**
 * Streaming counterpart to `callCompanionModel`: calls `onDelta` with text
 * fragments as they arrive instead of returning only once the reply is ready.
 */
export async function streamCompanionModel(
  options: {
    model: string;
    maxTokens: number;
    system: string;
    messages: LlmMessage[];
    tools?: LlmTool[];
  },
  onDelta: (text: string) => void,
): Promise<LlmResponse> {
  const { model, maxTokens, system, messages } = options;
  const tools = options.tools ?? [];
  const gw = gateway(model);
  if (!gw) throw new LlmError("The AI companion isn't configured yet.");

  if (gw.native) return streamAnthropicNative(gw, maxTokens, system, messages, tools, onDelta);
  return streamOpenRouter(gw, model, maxTokens, system, messages, tools, onDelta);
}

/**
 * Call OpenRouter (Claude). Callers keep a single Anthropic-shaped contract.
 */
export async function callCompanionModel(options: {
  model: string;
  maxTokens: number;
  system: string;
  messages: LlmMessage[];
  tools?: LlmTool[];
}): Promise<LlmResponse> {
  const { model, maxTokens, system, messages } = options;
  const tools = options.tools ?? [];
  const gw = gateway(model);
  if (!gw) throw new LlmError("The AI companion isn't configured yet.");

  if (gw.native) return callAnthropicNative(gw, maxTokens, system, messages, tools);
  return callOpenRouter(gw, model, maxTokens, system, messages, tools);
}
