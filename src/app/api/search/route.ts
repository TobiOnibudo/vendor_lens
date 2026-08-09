import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { ChatTurn } from "@/lib/ai";
import { runVendorLensAgent } from "@/lib/agent/run";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, history = [] } = body as {
      question: string;
      history?: ChatTurn[];
    };

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const priorTurns = Array.isArray(history)
      ? history.filter(
          (t) =>
            t &&
            (t.role === "user" || t.role === "assistant") &&
            typeof t.content === "string"
        )
      : [];

    const supabase = await createServiceClient();

    const { answer, toolsCalled, chunksRetrieved } = await runVendorLensAgent(
      supabase,
      question,
      priorTurns
    );

    console.log(
      "[search] tools:",
      toolsCalled.join(", ") || "none",
      "| chunks:",
      chunksRetrieved
    );

    return NextResponse.json({
      success: true,
      answer,
      sources: {
        chunksRetrieved,
        toolsCalled,
      },
    });
  } catch (err: unknown) {
    console.error("[search] ERROR:", err);
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
