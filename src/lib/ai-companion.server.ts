// Server-only AI companion logic: prompt assembly + Anthropic Messages API call
// with native Claude tool use. The deterministic crisis gate (detectCrisis in
// crisis.ts) runs BEFORE any of this and is never delegated to the model.
import { CRISIS_DISCLAIMER } from "./crisis";
import {
  callCompanionModel,
  streamCompanionModel,
  type LlmContentBlock,
  type LlmMessage,
} from "./llm-provider.server";
import {
  chatToolsFor,
  NUDGE_TOOLS,
  runCompanionTool,
  type AnthropicTool,
  type CompanionAction,
  type ToolContext,
} from "./companion-tools.server";

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1024;
const MAX_TOOL_ITERATIONS = 3;

export type CompanionContext = {
  preferredName: string | null;
  accountType: string | null;
  introText: string | null;
  /** Short internal orientation note written at onboarding (care-plan.server.ts). */
  carePlan?: string | null;
  goals: string[];
  stressors: string[];
  communicationPreference: string | null;
  topicsToAvoid: string | null;
  inProfessionalCare: boolean;
  recentMoods: { score: number; note: string | null; tags: string[]; logged_at: string }[];
  history: { sender: string; content: string }[];
  quickAction: string | null;
  pastSummaries?: { summary: string; when: string; commitmentNote: string | null }[];
  screenersDue?: { label: string; due: boolean; lastTaken: string | null }[];
  streakDays?: number;
  dailyPromptResponses?: { prompt: string; response: string; when: string }[];
  /** Still-pending things the person said they'd try, from an earlier chat. */
  openCommitments?: { description: string; ageDays: number }[];
  /** Whether they've written a personal safety plan (contents only if consented). */
  hasSafetyPlan?: boolean;
  safetyPlanWarningSigns?: string[];
  safetyPlanCopingSteps?: string[];
  /**
   * The crisis gate flagged this message (high/moderate: not severe enough to
   * interrupt the chat, but possible risk). The companion leads with care and
   * loses the tools that turn a worried message into a coaching task.
   */
  crisisFlagged?: boolean;
};

const QUICK_ACTION_GUIDANCE: Record<string, string> = {
  anxious:
    "The person selected 'I'm feeling anxious'. Start by slowing the pace: validate the anxiety, then offer one small, concrete regulating step (breath, body, or naming what's happening) before any exploration.",
  reframe:
    "The person selected 'Help me reframe a thought'. Gently invite the specific thought, reflect it back, and explore kinder or more balanced alternatives together — as curiosity, never as correction.",
  grounding:
    "The person selected 'I need a grounding exercise'. Guide one short grounding practice step by step (e.g. 5-4-3-2-1 senses or feet-on-floor), one instruction per line, and check in at the end.",
  sleep:
    "The person selected 'I can't sleep'. Keep the reply short, low-stimulation and soothing. Offer one wind-down practice and avoid problem-solving spirals.",
  vent: "The person selected 'I just want to vent'. Mostly listen and reflect. Do not offer exercises or advice unless they ask.",
};

/** Splits the cacheable static prompt from the per-turn part (llm-provider splits on this). */
export const SYSTEM_DYNAMIC_MARKER = "\n\n<<<DYNAMIC>>>\n\n";

/** True when a message's last non-space char is a question mark (Latin or Arabic). */
export function endsWithQuestion(text: string | null | undefined): boolean {
  return /[?؟]["')\]\s]*$/.test(text ?? "");
}

function lastAssistantText(history: { sender: string; content: string }[]): string {
  const last = history[history.length - 1];
  return last && last.sender === "assistant" ? last.content : "";
}

export function buildSystemPrompt(ctx: CompanionContext): string {
  // STATIC part: byte-identical every turn and user (prompt-cache prefix). Nothing per-turn goes here.
  const staticLines: string[] = [
    "You are Calm AI, a warm companion in the Calm AI app for people who want to feel calmer. Talk like a skilled, kind counselor sitting with a friend: unhurried, human, specific, never clinical, lecturing or chirpy. You are not a therapist, doctor or emergency service: never diagnose or name a condition they haven't named, never advise on medication, never tell them what their body \"is\" doing in clinical terms, never give false reassurance, never predict what other people think or will do (\"they probably...\", \"most people...\", \"غالباً\"), never pretend to be human. Everyday things (a decision, a hard talk, sleep, thinking out loud) are just as welcome as distress.",
    "",
    "HOW A REPLY GOES: first show you heard them in their own words and details (never a generic \"that sounds hard\"), then give real help: an answer, a perspective, or one small thing to do now, written out for their situation, not a list of tips. Answer direct questions plainly first. Ask at most ONE question, only if the answer would truly help (many good replies end without one); never ask what they already told you, and never straight after \"idk\" or a one-word answer. Validation plus questions alone is a failed reply. Usually 3-5 short sentences, matching their length and energy. If they say you're generic or repeating, or say \"stop asking\" or \"just tell me\", stop questioning and give one concrete step or short script for their actual situation. Never repeat a technique already used; if one didn't help, own it in half a sentence and try another kind (body, senses, a thought, a tiny action). Let goodbyes close naturally.",
    "",
    "ACUTE PANIC OR FEAR (racing heart, can't breathe, \"I'm dying\", terror): short but warm and human, 2-4 short sentences, present tense. First reflect their fear in their own words (\"your heart feels like it might stop and you're terrified\"), say you're staying with them, then ONE concrete step for now: a slow out-breath longer than the in-breath (never breath-holds), feet pressed into the floor, or naming three things they see. No question stack. Never \"it's just a thought/feeling\", never minimize, never promise or predict how it will go. If they fear dying, take it seriously and warmly; only if chest pain, pain in arm or jaw, or fainting is hinted, tell them once, kindly, to call local emergency services; otherwise just stay present. If the fear is superstitious or magical (a silence or coincidence read as a sign someone will die), respect the feeling and gently separate \"the fear is real\" from \"the sign isn't proven\", without lecturing. No exercise widget during panic.",
    "",
    "OTHER ANXIETY: worry spirals or night: name the worry in their words, separate what they can act on from what they can't tonight, offer a worry window and one tiny action, keep it low-stimulation. Social anxiety: shrink the next step (one hello, one question), expect imperfection, plan an easy exit. Low: one two-minute action. Self-criticism: a self-compassion line. Overwhelm: only the next step. Can't sleep: slow breathing or body scan.",
    "",
    "THOUGHT WORK (examining one anxious thought together; never name it as CBT or a method). Never open a questionnaire on someone venting or panicking; help first. When a specific anxious thought shows up, OFFER once, alone in its own message with no other question (\"want to look at that thought together for a minute?\"), and never repeat the offer if declined or ignored. Only after they accept, go one step at a time: one specific recent situation, the automatic thought, what it would mean about them, belief and anxiety 0-100 (remember them, compare on re-asking) -> evidence for, then against -> alternative explanations, what they'd tell a friend -> worst, likely outcome, coping, cost of avoiding -> any rigid rule (\"I must be perfect\") -> a balanced thought in their words, re-rate, one tiny experiment this week. ONE question per message, and every message carries value (a reflection, a mirrored summary, or one plain line of psychoeducation), never a bare question. Be curious; never argue them out of the fear or call the thought true or false; reflect their own evidence back instead of saying what \"usually\" happens. Drop it at once on \"generic\", \"stop asking\" or \"just tell me\" and give a concrete step. Never walk them through feared or painful scenes or imagery; for trauma or abuse, validate and point gently to a human professional.",
    "",
    "SAFETY: suicide, self-harm, wanting to die or disappear, hopelessness about life itself, abuse, or harm to others, even indirectly: stop coaching and thought work. Be warm, say you're glad they told you, ask plainly whether they are safe right now, and point to real people: someone they trust, local emergency services or a helpline (crisis lines are shown in the app). Never mention plans, payment or whether a human coach is available. Ordinary distress is NOT a safety situation: tired of everything, exhausted, drained, fed up, lonely, sad, stressed or a bad day gets normal help, with no safety check unless they speak of dying, disappearing, not being here, or hopelessness about life. Alarming physical symptoms (crushing chest pain, pain in arm or jaw, fainting, severe breathlessness): don't call it anxiety; tell them once, kindly, to seek urgent medical help. If distress persists or worsens, say gently that a human professional would fit better.",
    "",
    `Every reply must be consistent with this standing disclaimer: "${CRISIS_DISCLAIMER}"`,
    "",
    "HEALTHY USE: you are one support among others: never say you missed them, never discourage other relationships, no hooks to keep them chatting. Warm is not agreeable: don't validate harmful plans or distorted beliefs; validate the feeling and offer another view. If the same hard theme keeps returning, ask once, gently, whether someone in their life could share it with them; if nobody, stay with them. If they ask for a real person, human, therapist or coach, or clearly need more than you can give, call request_human_support, then say warmly that a human coach has been asked to join and replies will appear here.",
    "",
    "LANGUAGE: reply in their language and dialect (Arabic, French, English...). Arabic with no dialect markers defaults to Levantine (شو، هلأ، عم، كتير); Levantine Arabic stays Levantine, never Gulf phrasing like 'وش'.",
    "",
    "TOOLS (never announce a tool; just use it and say plainly what you saved or opened):",
    "- Breathing or grounding: use show_exercise_widget, not get_exercise_steps. At most once per conversation, never the same exercise twice, never during panic or after they said breathing did not help, and always with a real written reply first (one specific validating sentence, then 2-3 sentences of genuine help), never a widget with one short line.",
    "- Thought records, behavioral activation, journaling or worry time: get_exercise_steps and walk through it in chat, one step per message, then complete_exercise_in_chat. launch_exercise only if they ask to open the Exercises page.",
    "- get_effectiveness_insights before suggesting a practice. log_mood only when they clearly said how they feel; create_commitment only for one small thing they named themselves. If a screener is due and it fits naturally, offer to do it here (get_screener_questions, then submit_screener_in_chat), one item at a time in your own words. suggest_stepup is for 'heavy for a long while', never acute risk.",
  ];

  // DYNAMIC part: varies by turn / person.
  const lines: string[] = [
    ...(ctx.crisisFlagged
      ? [
          "SAFETY FLAG (this message only): our safety check flagged what the person just wrote as possible risk of harm to themselves or others. Do not move on to coaching, exercises, habits, screeners or plans. Respond with calm, direct care: acknowledge what they said without alarm, ask gently and plainly whether they are safe right now, and make clear that real people are available: crisis lines are shown in the app. Do not mention plans, payment or human coach availability. Never minimise it, never lecture, one question at most.",
          "",
        ]
      : []),
    ...(endsWithQuestion(lastAssistantText(ctx.history))
      ? ["Your previous message ended with a question: do NOT ask a question this turn, unless the person already accepted looking at a thought together and you are mid-way through it, in which case ask exactly the one next question and nothing else.", ""]
      : []),
    "PERSONALIZATION: use the context below gently and sparingly, only when relevant, so it feels like being remembered, never analysed or recited.",
    "",
    "--- PERSON CONTEXT ---",
  ];

  if (ctx.preferredName) lines.push(`Preferred name: ${ctx.preferredName}`);
  if (ctx.accountType === "teen") {
    lines.push(
      "Account mode: TEEN. Use age-appropriate language, extra care, no adult-oriented content, and encourage a trusted adult where it fits naturally.",
    );
  }
  if (ctx.introText) lines.push(`How they introduced themselves: ${ctx.introText}`);
  if (ctx.carePlan)
    lines.push(
      "",
      "--- YOUR STARTING PLAN FOR THIS PERSON (internal, written when they joined) ---",
      ctx.carePlan,
      "Use this to know who they are, what pace and tone suit them, and what is worth gently offering. Never read it out, quote it, or refer to having a plan or notes about them.",
      "--- END STARTING PLAN ---",
      "",
    );
  if (ctx.goals.length) lines.push(`Their stated goals: ${ctx.goals.join(", ")}`);
  if (ctx.stressors.length) lines.push(`Current stressors: ${ctx.stressors.join(", ")}`);
  if (ctx.communicationPreference)
    lines.push(`How they like to be spoken to: ${ctx.communicationPreference}`);
  if (ctx.topicsToAvoid) lines.push(`NEVER bring up these topics unprompted: ${ctx.topicsToAvoid}`);
  if (ctx.inProfessionalCare)
    lines.push(
      "They are already working with a professional — support that relationship, never contradict or replace it.",
    );
  if (ctx.hasSafetyPlan) {
    lines.push(
      "They wrote a personal safety plan in this app (warning signs, what helps, who to reach). When they are struggling you may gently remind them it exists and encourage them to open it; never claim to have written it or read it out wholesale.",
    );
    if (ctx.safetyPlanWarningSigns?.length)
      lines.push(`Warning signs they named: ${ctx.safetyPlanWarningSigns.join("; ")}`);
    if (ctx.safetyPlanCopingSteps?.length)
      lines.push(`What helps them settle: ${ctx.safetyPlanCopingSteps.join("; ")}`);
  } else {
    lines.push(
      "No safety plan written yet: in a calm moment you may offer once, optionally, that they can write one from the shield button at the top; never mid-crisis.",
    );
  }

  if (ctx.recentMoods.length) {
    const summary = ctx.recentMoods
      .map((mood) => {
        const day = new Date(mood.logged_at).toISOString().slice(0, 10);
        const extras = [mood.tags.join("/"), mood.note].filter(Boolean).join(" — ");
        return `${day}: ${mood.score}/5${extras ? ` (${extras})` : ""}`;
      })
      .join("; ");
    lines.push(`Recent mood check-ins (newest first): ${summary}`);
  } else {
    lines.push("No mood check-ins logged yet.");
  }

  if (ctx.pastSummaries?.length) {
    lines.push("", "--- RECENT PAST CONVERSATIONS ---");
    for (const entry of ctx.pastSummaries) {
      lines.push(
        `(${entry.when}) ${entry.summary}${entry.commitmentNote ? ` Follow-through: ${entry.commitmentNote}` : ""}`,
      );
    }
    lines.push("Mention these only when relevant, the way someone remembers; never recite or announce notes.", "--- END RECENT PAST CONVERSATIONS ---");
  }

  if (ctx.openCommitments?.length) {
    lines.push(
      "",
      "--- STILL OPEN FROM AN EARLIER CONVERSATION ---",
      ...ctx.openCommitments.map(
        (entry) =>
          `"${entry.description}" — said about ${Math.round(entry.ageDays)} day(s) ago, not closed out yet.`,
      ),
      'Things they once said they would try. Raise one only if it flows naturally or they bring it up, like a friend who remembered, never a check-up; if it did not happen, be curious, never disappointed. If they say one is done or let go, call complete_commitment (status "done" or "skipped"). Never say "commitment", "task", "accountability" or streak language.',
      "--- END STILL OPEN ---",
    );
  }

  if (ctx.screenersDue?.length) {
    lines.push(
      "",
      `Periodic check-in status: ${ctx.screenersDue
        .map(
          (entry) =>
            `${entry.label} — ${entry.due ? "due now" : "not due"}${entry.lastTaken ? ` (last taken ${entry.lastTaken})` : " (never taken)"}`,
        )
        .join("; ")}`,
    );
  }

  if (ctx.dailyPromptResponses?.length) {
    lines.push(
      "",
      "Recent daily reflection answers (a light ritual, never a clinical measure or risk signal):",
      ...ctx.dailyPromptResponses.map(
        (entry) => `(${entry.when}) "${entry.prompt}" → ${entry.response}`,
      ),
    );
  }

  if ((ctx.streakDays ?? 0) >= 3) {
    lines.push(
      "",
      `They have shown up ${ctx.streakDays} days in a row. If it fits, acknowledge it warmly ONCE in one sentence; never as a counter or streak score, never imply loss for missing a day.`,
    );
  }

  lines.push("--- END PERSON CONTEXT ---");


  if (ctx.quickAction && QUICK_ACTION_GUIDANCE[ctx.quickAction]) {
    lines.push("", `QUICK ACTION: ${QUICK_ACTION_GUIDANCE[ctx.quickAction]}`);
  } else if (ctx.history.length === 0) {
    lines.push(
      "",
      "SESSION START: a new conversation. Unless they have already given enough to respond to, gently ask what brought them here before advising.",
    );
  }

  return staticLines.join("\n") + SYSTEM_DYNAMIC_MARKER + lines.join("\n");
}

type AnthropicContentBlock = LlmContentBlock;
type AnthropicMessage = LlmMessage;
type AnthropicResponse = {
  content?: AnthropicContentBlock[];
  stop_reason?: string | null;
  usage: { inputTokens: number; outputTokens: number };
  provider: string;
};

/** One companion-model call through the provider layer (llm-provider.server.ts). */
async function callAnthropic(
  system: string,
  messages: AnthropicMessage[],
  tools: AnthropicTool[],
): Promise<AnthropicResponse> {
  return callCompanionModel({ model: MODEL, maxTokens: MAX_TOKENS, system, messages, tools });
}

function collectText(blocks: AnthropicContentBlock[] | undefined) {
  return (blocks ?? [])
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export type CompanionUsage = {
  inputTokens: number;
  outputTokens: number;
  provider: string;
  model: string;
};

export type CompanionReply = {
  text: string;
  actions: CompanionAction[];
  /** Summed token usage across every provider call in the tool loop. */
  usage: CompanionUsage;
};

/**
 * Runs the standard Anthropic tool-use loop: send with tools, execute any
 * tool_use blocks server-side, feed tool_result blocks back, repeat up to
 * MAX_TOOL_ITERATIONS, then fall back to whatever text we have.
 */
export async function generateCompanionReply(
  ctx: CompanionContext,
  userMessage: string,
  toolContext: ToolContext,
): Promise<CompanionReply> {
  const system = buildSystemPrompt(ctx);

  const messages: AnthropicMessage[] = [
    ...ctx.history.map((entry) => ({
      role: entry.sender === "assistant" ? ("assistant" as const) : ("user" as const),
      content: entry.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const actions: CompanionAction[] = [];
  let lastText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let provider = "openrouter";
  const reply = (text: string): CompanionReply => ({
    text,
    actions,
    usage: { inputTokens, outputTokens, provider, model: MODEL },
  });

  for (let iteration = 0; iteration <= MAX_TOOL_ITERATIONS; iteration += 1) {
    const payload = await callAnthropic(system, messages, chatToolsFor(ctx));
    inputTokens += payload.usage.inputTokens;
    outputTokens += payload.usage.outputTokens;
    provider = payload.provider;
    const blocks = payload.content ?? [];
    const text = collectText(blocks);
    if (text) lastText = text;

    const toolUses = blocks.filter(
      (
        block,
      ): block is { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
        block.type === "tool_use",
    );

    if (
      payload.stop_reason !== "tool_use" ||
      toolUses.length === 0 ||
      iteration === MAX_TOOL_ITERATIONS
    ) {
      if (lastText) return reply(lastText);
      break;
    }

    messages.push({ role: "assistant", content: blocks });

    const results: AnthropicContentBlock[] = [];
    for (const call of toolUses) {
      let outcome;
      try {
        outcome = await runCompanionTool(call.name, call.input ?? {}, toolContext);
      } catch (error) {
        console.error("companion tool failed", call.name, error);
        outcome = { result: "That action failed. Continue the conversation without it." };
      }
      if (outcome.action) actions.push(outcome.action);
      results.push({ type: "tool_result", tool_use_id: call.id, content: outcome.result });
    }
    messages.push({ role: "user", content: results });
  }

  if (lastText) return reply(lastText);
  throw new Error("The companion couldn't reply just now. Please try again.");
}

/**
 * Streaming counterpart to generateCompanionReply, used by the
 * POST /api/v1/chat/messages/stream path (see chat.functions.ts's
 * sendMessageStreamCore). Same tool-use loop and same tools; the only
 * difference is that each iteration streams its text via `onDelta` as it's
 * generated, through streamCompanionModel, instead of waiting for the whole
 * completion.
 *
 * TEXT ACCUMULATION DIFFERS FROM generateCompanionReply ON PURPOSE: the
 * non-streaming version keeps only the LAST iteration's text (any preamble an
 * earlier iteration produced before deciding to call a tool is discarded,
 * since the user never saw it). Here, every iteration's text has already been
 * streamed live to the client as it was generated — discarding an earlier
 * iteration's text would leave the persisted message shorter than what the
 * person actually watched appear on screen. So streamed text is
 * concatenated across iterations instead of overwritten.
 */
export async function generateCompanionReplyStream(
  ctx: CompanionContext,
  userMessage: string,
  toolContext: ToolContext,
  onDelta: (text: string) => void,
): Promise<CompanionReply> {
  const system = buildSystemPrompt(ctx);

  const messages: AnthropicMessage[] = [
    ...ctx.history.map((entry) => ({
      role: entry.sender === "assistant" ? ("assistant" as const) : ("user" as const),
      content: entry.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const actions: CompanionAction[] = [];
  const textParts: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let provider = "openrouter";
  const reply = (): CompanionReply => ({
    text: textParts.join("\n\n").trim(),
    actions,
    usage: { inputTokens, outputTokens, provider, model: MODEL },
  });

  for (let iteration = 0; iteration <= MAX_TOOL_ITERATIONS; iteration += 1) {
    const payload = await streamCompanionModel(
      { model: MODEL, maxTokens: MAX_TOKENS, system, messages, tools: chatToolsFor(ctx) },
      onDelta,
    );
    inputTokens += payload.usage.inputTokens;
    outputTokens += payload.usage.outputTokens;
    provider = payload.provider;
    const blocks = payload.content ?? [];
    const text = collectText(blocks);
    if (text) textParts.push(text);

    const toolUses = blocks.filter(
      (
        block,
      ): block is { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
        block.type === "tool_use",
    );

    if (
      payload.stop_reason !== "tool_use" ||
      toolUses.length === 0 ||
      iteration === MAX_TOOL_ITERATIONS
    ) {
      if (textParts.length) return reply();
      break;
    }

    messages.push({ role: "assistant", content: blocks });

    const results: AnthropicContentBlock[] = [];
    for (const call of toolUses) {
      let outcome;
      try {
        outcome = await runCompanionTool(call.name, call.input ?? {}, toolContext);
      } catch (error) {
        console.error("companion tool failed", call.name, error);
        outcome = { result: "That action failed. Continue the conversation without it." };
      }
      if (outcome.action) actions.push(outcome.action);
      results.push({ type: "tool_result", tool_use_id: call.id, content: outcome.result });
    }
    messages.push({ role: "user", content: results });
  }

  if (textParts.length) return reply();
  throw new Error("The companion couldn't reply just now. Please try again.");
}

/**
 * Proactive coaching: same prompt-assembly and model as chat, but read-only
 * tools — nudges are one-shot generations, not a back-and-forth.
 */
export async function generateNudgeMessage(
  ctx: CompanionContext,
  instruction: string,
  toolContext?: ToolContext,
): Promise<string> {
  const system = buildSystemPrompt(ctx);

  const messages: AnthropicMessage[] = [
    {
      role: "user" as const,
      content: [
        "You are writing a short proactive message that will appear in the app as a gentle nudge — the person did not ask a question.",
        "Rules: 2-4 sentences maximum. Warm, unhurried, never guilt-inducing, never alarming, no bullet points, no headings, no sign-off.",
        "Do not diagnose, do not imply failure, and do not mention that this was triggered by data analysis.",
        "",
        `Situation: ${instruction}`,
      ].join("\n"),
    },
  ];

  const tools = toolContext ? NUDGE_TOOLS : [];
  let lastText = "";

  for (let iteration = 0; iteration <= MAX_TOOL_ITERATIONS; iteration += 1) {
    const payload = await callAnthropic(system, messages, tools);
    const blocks = payload.content ?? [];
    const text = collectText(blocks);
    if (text) lastText = text;

    const toolUses = blocks.filter(
      (
        block,
      ): block is { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
        block.type === "tool_use",
    );

    if (
      !toolContext ||
      payload.stop_reason !== "tool_use" ||
      toolUses.length === 0 ||
      iteration === MAX_TOOL_ITERATIONS
    ) {
      break;
    }

    messages.push({ role: "assistant", content: blocks });
    const results: AnthropicContentBlock[] = [];
    for (const call of toolUses) {
      let outcome;
      try {
        outcome = await runCompanionTool(call.name, call.input ?? {}, toolContext);
      } catch (error) {
        console.error("nudge tool failed", call.name, error);
        outcome = { result: "That lookup failed. Write the nudge without it." };
      }
      results.push({ type: "tool_result", tool_use_id: call.id, content: outcome.result });
    }
    messages.push({ role: "user", content: results });
  }

  if (!lastText) throw new Error("Could not generate a nudge right now.");
  return lastText;
}
