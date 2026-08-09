import type { Content } from "@google/genai";
import { getGeminiClient, type ChatTurn } from "@/lib/ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AGENT_TOOL_DECLARATIONS,
  executeAgentTool,
  type ToolExecutionMeta,
} from "./tools";

const MAX_TOOL_ROUNDS = 6;

const SYSTEM_INSTRUCTION = `You are VendorLens AI, an internal assistant for company vendors, contracts, and software tools.

You have tools to search and query company data. Use them when the user asks about vendors, contracts, spend, renewals, duplicates, or tools — do not guess.

Tool guidance:
- search_knowledge: semantic search for specific vendors, contract terms, capabilities
- list_vendors: rankings, department/category lists, spend overview
- list_contracts: renewal dates, auto-renew, contract values
- list_duplicate_groups: overlapping or duplicate tools

For follow-up questions, use conversation history and call tools again if needed.
For greetings or general chat, respond naturally without tools.
Be concise. Cite vendor names and dates from tool results only.`;

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
  const meta: ToolExecutionMeta = {
    toolsCalled: [],
    chunksRetrieved: 0,
  };

  const contents: Content[] = [
    ...history.slice(-20).map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    })),
    { role: "user", parts: [{ text: question }] },
  ];

  const ai = getGeminiClient();

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
      },
    });

    const functionCalls = response.functionCalls;
    if (!functionCalls?.length) {
      const text = response.text?.trim();
      return {
        answer:
          text ||
          "I couldn't generate a response. Please try rephrasing your question.",
        toolsCalled: meta.toolsCalled,
        chunksRetrieved: meta.chunksRetrieved,
      };
    }

    const modelTurn = response.candidates?.[0]?.content;
    if (modelTurn) {
      contents.push(modelTurn);
    }

    const responseParts: Array<{ functionResponse: { name: string; id?: string; response: Record<string, unknown> } }> = [];

    for (const call of functionCalls) {
      const toolName = call.name ?? "unknown";
      const toolArgs = (call.args ?? {}) as Record<string, unknown>;
      const result = await executeAgentTool(
        supabase,
        toolName,
        toolArgs,
        meta
      );

      responseParts.push({
        functionResponse: {
          name: toolName,
          id: call.id,
          response: { output: result },
        },
      });
    }

    contents.push({
      role: "user",
      parts: responseParts,
    });
  }

  return {
    answer:
      "I needed more steps than allowed to complete this request. Please try a simpler question.",
    toolsCalled: meta.toolsCalled,
    chunksRetrieved: meta.chunksRetrieved,
  };
}
