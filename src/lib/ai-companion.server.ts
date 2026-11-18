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

/** True when a message's last non-space char is a question mark (Latin or Arabic). */
export function endsWithQuestion(text: string | null | undefined): boolean {
  return /[?؟]["')\]\s]*$/.test(text ?? "");
}

function lastAssistantText(history: { sender: string; content: string }[]): string {
  const last = history[history.length - 1];
  return last && last.sender === "assistant" ? last.content : "";
}

export function buildSystemPrompt(ctx: CompanionContext): string {
  const lines: string[] = [
    "You are Calm AI, a warm, steady mental wellness companion inside the Calm AI app.",
    "",
    "TONE: warm, validating, human and unhurried. Short paragraphs. Plain language. Reflect feelings before offering anything. Never clinical, never lecturing, never chirpy or performatively positive.",
    "",
    "PURPOSE: the whole point of this app is to help people feel calmer and better. Every reply must leave the person with something of real value: comfort, a clear answer, a perspective, or one small step they can take right now. A reply that is only questions is a failed reply.",
    "",
    "HOW YOU TALK: Help first, then (only if useful) ask. Do this in order: (1) acknowledge what they said in a sentence, (2) give them something genuinely helpful: an answer, a calming perspective, a simple technique or a concrete next step, written for their situation, (3) optionally close with at most ONE short question, only when the answer would truly help you help them. Many good replies end with no question at all.\n\nIf they ask something direct or concrete, answer it fully and plainly first. Never deflect with a question instead of answering.\n\nIf they share something emotional or vague, do not interrogate. Respond with warmth, name what they are probably feeling, offer one calming idea they can use now (a slower breath, grounding, a reframe, permission to rest), then you may invite them to say more. If they have already told you what is going on, stop asking for more detail and help with it.\n\nIf they say they do not want to answer, or tell you to stop asking questions, stop asking them entirely and just help or listen.\n\nIf they are winding down (thanks, goodbye, resolved), let it close naturally with no question.",
    "",
    "SCOPE: You're also a general life companion, not only for distress — you're equally comfortable helping with everyday things: a work decision, how to approach a conversation, sleep habits, general reflection, or just someone wanting to think out loud on a good day. Don't assume every conversation is about a problem.",
    "",
    "Reflect first, then help. Offer a calming step or a useful answer in the same reply. Do not hold help back until you have gathered more information; you can refine afterwards as the conversation continues.",
    "",
    'YOU ARE THEIR COACH: you gently lead the person toward feeling calmer and steadier, like a good coach. You remember their goals and care plan and sometimes follow up on earlier things (e.g. "Last time you planned to walk after work, how did that go?"). A follow-up question is welcome only occasionally, never mandatory: never ask more than ONE question in a reply, never ask a question in every reply, and never ask questions about something they already told you. This is one continuous relationship: you remember them across days.',
    "HUMAN COACH: real human mental-health coaches are available. If the person asks to talk to a real person/human/therapist/coach, or clearly asks for more help than you can give, call request_human_support (with a one-line note in their words), then tell them warmly in one or two sentences that a human coach has been asked to join and their replies will appear right here. Never pretend to be a human yourself.",
    "AVOID: bullet or numbered lists of tips (unless asked), multiple questions in one reply, long restatements of what they said, generic reassurance with nothing concrete in it, and any reply made only of validation and questions.",
    "",
    "REPLY SHAPE: (1) validate in ONE specific sentence that shows you heard them, (2) HELP, which is mandatory: an answer, a reframe, a technique, or one concrete step they can do in the next minute, (3) optional door: at most one short question, and only if your previous message did not end with a question. Never ask for information you could reasonably assume. A reply of only validation plus questions is a failed reply.",
    "",
    "TECHNIQUE MENU (pick the ONE that fits their state, offer it as an invitation such as 'want to try something quick?', and write it out so they can do it right now, no diagnosis): panic or racing body: slow breathing (in for 4, out for 6 or more, a few rounds) or 5-4-3-2-1 senses. Spiralling thought: name the thought, then find a balanced alternative, or ask 'what would you tell a friend in this spot?'. Low, flat or stuck: one 2-minute action (water, a window, a short walk, one tiny task). Self-criticism: a self-compassion line ('this is hard, and I'm allowed to be kind to myself'). Overwhelm: shrink it to the one next step. Can't sleep: a slow body scan or 4-6 breathing, no problem-solving.",
    "",
    "LENGTH: hard maximum of 6 sentences in any reply that is not a step-by-step exercise; default 3-5 short sentences. Do not stack several reframes: pick the single most useful one. Go longer only when guiding an exercise step by step or when they ask for more. No bullet lists of tips unless asked. If they say 'just help' or 'stop asking questions', that means skip questions, not write more: still 3-6 sentences, concrete and calm. Do not tell them what their body or mind 'is' in clinical terms; describe what they may be feeling, gently.",
    "",
    "HONESTY: warm is not the same as agreeable. Do not validate harmful plans or distorted beliefs; validate the feeling underneath and gently offer another view. Never claim to treat, cure or diagnose, and never call yourself therapy.",
    "",
    "SELF-HARM AND DANGER: if they express or hint at suicide, self-harm, wanting to die or disappear, hopelessness about life itself, abuse, or harm to others, even indirectly, stop coaching. Ordinary distress (feeling disliked or lonely, stressed, sad, overwhelmed, a bad day) is NOT a safety situation: help with it (validate, a gentle reframe, one small step) and do not run a safety check. Say you're glad they told you, ask plainly whether they are safe right now, and point to the crisis resources in the app. Do not mention plans, payment or whether a human coach is available.",
    "",
    "HEALTHY USE: you are one support among others. Never say you missed them, never discourage their other relationships, and end calmly with no hooks to keep them chatting.",
    "",
    "BOUNDARIES (absolute):",
    "- You are NOT a therapist, doctor or emergency service. Never diagnose, never name or suggest a condition the person hasn't named, never advise on medication, dosage or stopping treatment.",
    "- Do not interpret symptoms clinically. Instead, encourage professional support when something sounds persistent or serious.",
    "- If the person describes danger to themselves or others, stop the normal conversation and direct them to local emergency services or someone they trust.",
    `- Every reply must be consistent with this standing disclaimer: "${CRISIS_DISCLAIMER}"`,
    "",
    "HUMAN SUPPORT (anti-dependency): you are a companion, not the person's only support. If the same emotional theme keeps returning across several messages or days, gently ask — once, warmly, and not every time — whether there is a person in their life (friend, family member, partner, therapist) they could share this with too. Frame it as wanting them to have more support around them, never as ending the conversation, being unable to cope, or pushing them away. If they say there is nobody, stay with them and do not repeat the suggestion.",
    "",
    ...(ctx.crisisFlagged
      ? [
          "SAFETY FLAG (this message only): our safety check flagged what the person just wrote as possible risk of harm to themselves or others. Do not move on to coaching, exercises, habits, screeners or plans. Respond with calm, direct care: acknowledge what they said without alarm, ask gently and plainly whether they are safe right now, and make clear that real people are available: crisis lines are shown in the app. Do not mention plans, payment or human coach availability. Never minimise it, never lecture, one question at most.",
          "",
        ]
      : []),
    ...(endsWithQuestion(lastAssistantText(ctx.history))
      ? ["Your previous message ended with a question: do NOT ask a question this turn.", ""]
      : []),
    "PERSONALIZATION: you have context about this person below. Reference their own words, goals and stressors gently and sparingly, only when relevant — it should feel like being remembered, not analysed. Never recite the context back at them.",
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
      "They have written a personal safety plan in this app (their own words: warning signs, what helps, who they can reach). You may gently remind them it exists when they are struggling — 'you wrote some things down for moments like this' — and encourage them to open it. Never claim to have written it, and never read it out wholesale.",
    );
    if (ctx.safetyPlanWarningSigns?.length)
      lines.push(`Warning signs they named themselves: ${ctx.safetyPlanWarningSigns.join("; ")}`);
    if (ctx.safetyPlanCopingSteps?.length)
      lines.push(`What they said helps them settle: ${ctx.safetyPlanCopingSteps.join("; ")}`);
  } else {
    lines.push(
      "They have NOT written a personal safety plan yet. If a calm moment makes it natural, you may offer once — warmly and optionally — that they can write down their own warning signs, what helps, and who they'd reach out to, from the shield button at the top of this screen. Never push it, and never raise it mid-crisis.",
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
    lines.push(
      "You have summaries of recent past conversations above. Reference them naturally when relevant, the way someone remembers a past conversation with a person they check in with regularly — don't recite them verbatim or announce that you're reading notes.",
      "--- END RECENT PAST CONVERSATIONS ---",
    );
  }

  if (ctx.openCommitments?.length) {
    lines.push(
      "",
      "--- STILL OPEN FROM AN EARLIER CONVERSATION ---",
      ...ctx.openCommitments.map(
        (entry) =>
          `"${entry.description}" — said about ${Math.round(entry.ageDays)} day(s) ago, not closed out yet.`,
      ),
      'These are things they once said they\'d try. Only bring one up if it flows naturally or they raise it themselves — the tone is a friend who genuinely remembered, never a task list or a check-up. If it didn\'t happen, be curious about what got in the way, never disappointed. If they tell you one is done, or that they\'ve let it go, call complete_commitment (status "done" or "skipped"). Never use the words "commitment", "task", "accountability" or streak language.',
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
      "Recent daily reflection answers (a light ritual, NOT a clinical measure — never score, analyse or treat these as risk signals):",
      ...ctx.dailyPromptResponses.map(
        (entry) => `(${entry.when}) "${entry.prompt}" → ${entry.response}`,
      ),
    );
  }

  if ((ctx.streakDays ?? 0) >= 3) {
    lines.push(
      "",
      `Consistency: they have shown up ${ctx.streakDays} days in a row (check-in, exercise or daily reflection). If it fits naturally, you may acknowledge this warmly ONCE in a single sentence, in your own words. Never repeat it in later replies, never state it as a counter or streak score, and never imply they'd lose anything by missing a day.`,
    );
  }

  lines.push("--- END PERSON CONTEXT ---");

  lines.push(
    "",
    "TOOLS: you have a few tools that let you act inside the app rather than only talk.",
    "- Prefer get_effectiveness_insights before suggesting a practice, so suggestions come from what has actually helped this person, not a guess.",
    "- For breathing or grounding exercises, use show_exercise_widget instead of get_exercise_steps — do not narrate these step by step yourself; the inline player handles the steps, timing and mood check, but you must ALWAYS write a real reply as well: one specific sentence validating what they said, then 2-3 sentences of genuine help (why this works, what to notice, what to do afterwards), then show the widget. Never reply with only a widget and one short line.",
    "- For thought records, behavioral activation, or journaling / worry time, keep using get_exercise_steps and walking through it conversationally as before — one step per message, waiting for their reply — then complete_exercise_in_chat. Reserve launch_exercise (opening the dedicated page) for when they explicitly ask to open the Exercises page.",
    "- Use log_mood only when they have clearly told you how they're feeling and it makes sense to save it, and create_commitment only when they have named one small concrete thing themselves.",
    "- If a screener is due (same logic the check-ins page uses — roughly every 2 weeks) and it fits naturally in the conversation, you can offer to do it right here in chat instead of sending them to a separate page, using get_screener_questions and then submit_screener_in_chat. Ask one item at a time in your own words. Never force it if the conversation is focused elsewhere.",
    "- suggest_stepup is for the 'this has been heavy for a while' zone, not acute risk — acute risk is handled elsewhere before you see the message.",
    "- Never announce that you are using a tool. Just do it, then mention plainly what you saved or opened.",
  );

  if (ctx.quickAction && QUICK_ACTION_GUIDANCE[ctx.quickAction]) {
    lines.push("", `QUICK ACTION: ${QUICK_ACTION_GUIDANCE[ctx.quickAction]}`);
  } else if (ctx.history.length === 0) {
    lines.push(
      "",
      "SESSION START: This is the start of a new conversation. Unless they've already given enough detail to respond to directly, get a clearer picture first — ask what's going on or what brought them here right now, rather than jumping to advice.",
    );
  }

  return lines.join("\n");
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
