import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config.js";
import { supabase, type AgentUser } from "../db/supabase.js";
import { toolDefinitions } from "../tools/definitions.js";
import { toolHandlers, type ToolContext } from "../tools/handlers.js";
import { buildSystemPrompt } from "./prompt.js";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const WORKING_MEMORY_TURNS = 20;
const MAX_TOOL_ITERATIONS = 6;

async function loadRecentHistory(userId: string): Promise<Anthropic.MessageParam[]> {
  const { data, error } = await supabase
    .from("agent_messages")
    .select("role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(WORKING_MEMORY_TURNS);
  if (error) throw error;

  return (data ?? [])
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

async function persistMessage(
  userId: string,
  role: "user" | "assistant",
  content: string,
  toolCalls?: unknown
): Promise<string> {
  const { data, error } = await supabase
    .from("agent_messages")
    .insert({ user_id: userId, role, content, tool_calls: toolCalls ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Runs one full turn: persists the inbound message, builds context, drives
 * the Claude tool-use loop until a plain text reply comes back, persists the
 * reply, and returns it for the channel adapter to send.
 */
export async function handleIncomingMessage(user: AgentUser, userText: string): Promise<string> {
  const inboundMessageId = await persistMessage(user.id, "user", userText);
  const history = await loadRecentHistory(user.id);

  const systemPrompt = buildSystemPrompt({ user, nowIso: new Date().toISOString() });
  const toolCtx: ToolContext = { userId: user.id, currentMessageId: inboundMessageId };

  const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: userText }];

  let finalText: string | null = null;
  let lastToolCallsSummary: unknown[] = [];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS && finalText === null; iteration++) {
    const response = await anthropic.messages.create({
      model: env.CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: toolDefinitions,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      finalText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      break;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      const handler = toolHandlers[toolUse.name];
      let resultPayload: unknown;
      let isError = false;
      try {
        if (!handler) throw new Error(`Unknown tool: ${toolUse.name}`);
        resultPayload = await handler(toolUse.input, toolCtx);
        lastToolCallsSummary.push({ tool: toolUse.name, input: toolUse.input });
      } catch (err) {
        isError = true;
        resultPayload = { error: err instanceof Error ? err.message : String(err) };
        console.error(`Tool ${toolUse.name} failed for user ${user.id}:`, err);
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(resultPayload),
        is_error: isError,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  if (finalText === null) {
    finalText =
      "Sorry, dat kostte me even te veel stappen om goed af te handelen -- probeer het nog eens of formuleer het iets anders.";
    console.error(`Tool loop exceeded ${MAX_TOOL_ITERATIONS} iterations for user ${user.id}`);
  }

  await persistMessage(user.id, "assistant", finalText, lastToolCallsSummary);
  return finalText;
}
