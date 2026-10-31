import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { extractContractData } from "@/lib/ai";
import { indexContract } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const vendorId = formData.get("vendor_id") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    let fileUrl: string | null = null;
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("contracts")
        .upload(fileName, file);

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from("contracts")
          .getPublicUrl(uploadData.path);
        fileUrl = urlData.publicUrl;
      }
    } catch {
      // Storage upload failed; continue without file URL.
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    const extracted = await extractContractData({ data: base64, mimeType });
    const searchableText =
      typeof extracted.searchable_text === "string"
        ? extracted.searchable_text
        : null;

    let resolvedVendorId: string | null = vendorId || null;
    let autoLinked = false;

    if (!resolvedVendorId && extracted.vendor_name) {
      const needle = (extracted.vendor_name as string).toLowerCase().trim();

      const { data: allVendors } = await supabase
        .from("vendors")
        .select("id, name, canonical_name, aliases")
        .eq("is_active", true);

      if (allVendors) {
        for (const v of allVendors) {
          const candidates: string[] = [
            v.name,
            v.canonical_name,
            ...(Array.isArray(v.aliases) ? v.aliases : []),
          ]
            .filter(Boolean)
            .map((s: string) => s.toLowerCase().trim());

          if (candidates.some((c) => c === needle)) {
            resolvedVendorId = v.id;
            autoLinked = true;
            break;
          }

          if (
            candidates.some(
              (c) => needle.includes(c) || c.includes(needle)
            )
          ) {
            resolvedVendorId = v.id;
            autoLinked = true;
            break;
          }
        }
      }
    }

    const { data: contract, error } = await supabase
      .from("contracts")
      .insert({
        vendor_id: resolvedVendorId,
        file_name: file.name,
        file_url: fileUrl,
        renewal_date: extracted.renewal_date || null,
        auto_renew: extracted.auto_renew ?? null,
        notice_period_days: extracted.notice_period_days || null,
        contract_value: extracted.contract_value || null,
        pricing_escalation: extracted.pricing_escalation || null,
        summary: extracted.summary || null,
        key_terms: extracted.key_terms || [],
        full_text: searchableText,
        status: "pending_review",
        extracted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    if (contract && resolvedVendorId) {
      const vendorName =
        (extracted.vendor_name as string) ||
        (
          await supabase
            .from("vendors")
            .select("name")
            .eq("id", resolvedVendorId)
            .single()
        ).data?.name ||
        "Unknown Vendor";

      try {
        await indexContract(
          supabase,
          {
            id: contract.id,
            vendor_id: resolvedVendorId,
            file_name: contract.file_name,
            renewal_date: contract.renewal_date,
            auto_renew: contract.auto_renew,
            notice_period_days: contract.notice_period_days,
            contract_value: contract.contract_value,
            pricing_escalation: contract.pricing_escalation,
            summary: contract.summary,
            key_terms: contract.key_terms as string[] | null,
            full_text: searchableText,
          },
          vendorName,
          searchableText
        );
      } catch (indexErr) {
        console.error("[contracts/upload] Indexing failed:", indexErr);
      }
    }

    return NextResponse.json({
      success: true,
      contract,
      extracted,
      autoLinked,
      detectedVendorName: extracted.vendor_name ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
