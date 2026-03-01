import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      vendor_id,
      file_name,
      renewal_date,
      auto_renew,
      notice_period_days,
      contract_value,
      pricing_escalation,
      summary,
      key_terms,
    } = body;

    if (!file_name?.trim()) {
      return NextResponse.json({ error: "Contract name is required" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from("contracts")
      .insert({
        vendor_id: vendor_id || null,
        file_name: file_name.trim(),
        file_url: null,
        renewal_date: renewal_date || null,
        auto_renew: auto_renew ?? null,
        notice_period_days: notice_period_days || null,
        contract_value: contract_value || null,
        pricing_escalation: pricing_escalation || null,
        summary: summary || null,
        key_terms: key_terms?.length ? key_terms : null,
        status: "confirmed",
        extracted_at: null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, contract: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create contract";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
