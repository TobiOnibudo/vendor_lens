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

    // Extract text from PDF (simplified — uses the raw text)
    const arrayBuffer = await file.arrayBuffer();
    const textDecoder = new TextDecoder("utf-8");
    let rawText = textDecoder.decode(arrayBuffer);

    // Basic PDF text extraction — strip binary content
    rawText = rawText.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();

    if (rawText.length < 50) {
      rawText = `Contract document: ${file.name}. Unable to extract full text from PDF binary. Please review manually.`;
    }

    // Truncate for API limits
    const contractText = rawText.slice(0, 8000);

    // AI extraction
    const extracted = await extractContractData(contractText);

    // Store contract
    const { data: contract, error } = await supabase
      .from("contracts")
      .insert({
        vendor_id: vendorId || null,
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
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
