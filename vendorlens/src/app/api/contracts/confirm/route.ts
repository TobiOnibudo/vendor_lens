import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { contractId, updates } = await request.json();

    if (!contractId) {
      return NextResponse.json({ error: "Contract ID required" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { error } = await supabase
      .from("contracts")
      .update({
        ...updates,
        status: "confirmed",
        confirmed_by: updates.confirmed_by || null,
      })
      .eq("id", contractId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Confirmation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
