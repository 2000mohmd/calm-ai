import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  callCompanionModel,
  streamCompanionModel,
  toNativeMessages,
  type LlmMessage,
} from "./llm-provider.server";
import { estimateCostUsd } from "./rate-limit/pricing";

const tools = [
  { name: "a", description: "A", input_schema: { type: "object" } },
  { name: "b", description: "B", input_schema: { type: "object" } },
];

function sse(events: unknown[]): Response {
  const body = events.map((e) => `event: x\ndata: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(body, { status: 200 });
}

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "sk-test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const sent = () => JSON.parse(fetchMock.mock.calls[0]![1].body as string);

describe("native anthropic request shape", () => {
  it("posts to /v1/messages with cache breakpoints and converted history", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: {} })),
    );
    const messages: LlmMessage[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "a", input: { x: 1 } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "done" }] },
    ];
    await callCompanionModel({ model: "claude-sonnet-5", maxTokens: 50, system: "SYS", messages, tools });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers["x-api-key"]).toBe("sk-test");
    expect(init.headers["anthropic-version"]).toBe("2023-06-01");
    const body = sent();
    expect(body.model).toBe("claude-sonnet-5");
    expect(body.max_tokens).toBe(50);
    expect(body.system).toEqual([{ type: "text", text: "SYS", cache_control: { type: "ephemeral" } }]);
    expect(body.tools[0].cache_control).toBeUndefined();
    expect(body.tools[1].cache_control).toEqual({ type: "ephemeral" });
    expect(body.tools[1].input_schema).toEqual({ type: "object" });
    expect(body.messages[0]).toEqual({ role: "user", content: [{ type: "text", text: "hi" }] });
    // breakpoint on the last-but-one message only
    expect(body.messages[1].content[0].cache_control).toEqual({ type: "ephemeral" });
    expect(body.messages[2].content).toEqual([{ type: "tool_result", tool_use_id: "t1", content: "done" }]);
  });

  it("puts tool_result first and drops empty text", () => {
    const out = toNativeMessages([
      {
        role: "user",
        content: [
          { type: "text", text: "after" },
          { type: "text", text: "  " },
          { type: "tool_result", tool_use_id: "t", content: "r" },
        ],
      },
    ]);
    expect(out[0]!.content.map((b) => b.type)).toEqual(["tool_result", "text"]);
  });
});

describe("native non-streaming parse", () => {
  it("maps text, tool_use, stop_reason and usage", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [
            { type: "text", text: "hello" },
            { type: "tool_use", id: "t9", name: "a", input: { q: "z" } },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 10, output_tokens: 7, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000 },
        }),
      ),
    );
    const r = await callCompanionModel({ model: "m", maxTokens: 5, system: "s", messages: [{ role: "user", content: "x" }] });
    expect(r.provider).toBe("anthropic");
    expect(r.stop_reason).toBe("tool_use");
    expect(r.content).toEqual([
      { type: "text", text: "hello" },
      { type: "tool_use", id: "t9", name: "a", input: { q: "z" } },
    ]);
    expect(r.usage).toEqual({ inputTokens: 1110, outputTokens: 7, cacheReadTokens: 1000, cacheWriteTokens: 100 });
  });

  it("throws LlmError with status on failure", async () => {
    fetchMock.mockResolvedValue(new Response("overloaded", { status: 529 }));
    await expect(
      callCompanionModel({ model: "m", maxTokens: 5, system: "s", messages: [{ role: "user", content: "x" }] }),
    ).rejects.toThrow(/LLM gateway error 529: overloaded/);
  });
});

describe("native streaming parse", () => {
  it("emits text deltas, assembles tool_use JSON and merges usage", async () => {
    fetchMock.mockResolvedValue(
      sse([
        { type: "message_start", message: { usage: { input_tokens: 5, cache_read_input_tokens: 900, cache_creation_input_tokens: 0, output_tokens: 1 } } },
        { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
        { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hel" } },
        { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "lo" } },
        { type: "content_block_stop", index: 0 },
        { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "tu1", name: "a", input: {} } },
        { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"k":' } },
        { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '"v"}' } },
        { type: "content_block_stop", index: 1 },
        { type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 42 } },
        { type: "message_stop" },
      ]),
    );
    const deltas: string[] = [];
    const r = await streamCompanionModel(
      { model: "m", maxTokens: 5, system: "s", messages: [{ role: "user", content: "x" }], tools },
      (d) => deltas.push(d),
    );
    expect(sent().stream).toBe(true);
    expect(deltas).toEqual(["Hel", "lo"]);
    expect(r.stop_reason).toBe("tool_use");
    expect(r.content).toEqual([
      { type: "text", text: "Hello" },
      { type: "tool_use", id: "tu1", name: "a", input: { k: "v" } },
    ]);
    expect(r.usage).toEqual({ inputTokens: 905, outputTokens: 42, cacheReadTokens: 900, cacheWriteTokens: 0 });
  });
});

describe("estimateCostUsd with cache fields", () => {
  it("is unchanged without cache fields", () => {
    expect(estimateCostUsd("claude-sonnet-5", 1_000_000, 0)).toBeCloseTo(3);
  });
  it("prices reads at 0.1x and writes at 1.25x", () => {
    // 1M total = 800k read + 100k write + 100k plain: 0.24 + 0.375 + 0.3
    expect(estimateCostUsd("claude-sonnet-5", 1_000_000, 0, 800_000, 100_000)).toBeCloseTo(0.915);
    expect(estimateCostUsd("claude-haiku-4-5", 1_000_000, 0, 1_000_000, 0)).toBeCloseTo(0.1);
  });
});
