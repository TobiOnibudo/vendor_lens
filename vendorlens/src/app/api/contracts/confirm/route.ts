import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { indexContract } from "@/lib/rag";

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

    const { data: contract } = await supabase
      .from("contracts")
      .select("*, vendors(name)")
      .eq("id", contractId)
      .single();

    if (contract?.vendor_id) {
      const vendorName =
        (contract.vendors as { name?: string } | null)?.name || "Unknown Vendor";

      try {
        await indexContract(
          supabase,
          {
            id: contract.id,
            vendor_id: contract.vendor_id,
            file_name: contract.file_name,
            renewal_date: contract.renewal_date,
            auto_renew: contract.auto_renew,
            notice_period_days: contract.notice_period_days,
            contract_value: contract.contract_value,
            pricing_escalation: contract.pricing_escalation,
            summary: contract.summary,
            key_terms: contract.key_terms as string[] | null,
            full_text: contract.full_text,
          },
          vendorName
        );
      } catch (indexErr) {
        console.error("[contracts/confirm] Re-index failed:", indexErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Confirmation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
