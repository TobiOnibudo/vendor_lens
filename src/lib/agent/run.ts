import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatTurn } from "@/lib/ai";
import { createAgentTools, type ToolExecutionMeta } from "./tools";

const MAX_TOOL_ROUNDS = 6;
const CHAT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const SYSTEM_INSTRUCTION = `You are VendorLens AI, an internal assistant for company vendors, contracts, and software tools.

Use your tools whenever the user asks about vendors, contracts, spend, renewals, duplicates, or tools. Do not guess. For greetings or general chat, respond naturally without tools. Be concise, and cite vendor names and dates only from tool results.`;

export interface AgentResult {
  answer: string;
  toolsCalled: string[];
  chunksRetrieved: number;
}

export async function runVendorLensAgent(
  supabase: SupabaseClient,
  question: string,
  history: ChatTurn[] = []
): Promise<AgentResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY must be set to use VendorLens AI.");
  }
  const meta: ToolExecutionMeta = { toolsCalled: [], chunksRetrieved: 0 };
  const result = await generateText({
    model: openai(CHAT_MODEL),
    system: SYSTEM_INSTRUCTION,
    messages: [
      ...history.slice(-20).map((turn) => ({ role: turn.role, content: turn.content })),
      { role: "user" as const, content: question },
    ],
    tools: createAgentTools(supabase, meta),
    stopWhen: stepCountIs(MAX_TOOL_ROUNDS),
  });
  return {
    answer: result.text.trim() || "I couldn't generate a response. Please try rephrasing your question.",
    toolsCalled: meta.toolsCalled,
    chunksRetrieved: meta.chunksRetrieved,
  };
}
