import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { extractContractData } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const vendorId = formData.get("vendor_id") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Upload to Supabase Storage
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
      // Storage upload failed — continue without file URL
    }

    // Pass the PDF directly to Gemini as base64 so it can natively read the document
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    // AI extraction
    const extracted = await extractContractData({ data: base64, mimeType });

    // Auto-link vendor: if no manual selection, try to match the extracted vendor name
    // against existing vendors (name, canonical_name, aliases)
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

          // Exact match first
          if (candidates.some((c) => c === needle)) {
            resolvedVendorId = v.id;
            autoLinked = true;
            break;
          }

          // Partial match: extracted name contains or is contained by a candidate
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

    // Store contract
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
        status: "pending_review",
        extracted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

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
