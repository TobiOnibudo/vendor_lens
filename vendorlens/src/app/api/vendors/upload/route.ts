import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { clusterVendorNames, getEmbedding } from "@/lib/ai";

interface ParsedVendorRow {
  vendor_name: string;
  amount: number;
  department: string;
  category?: string;
  description?: string;
  period?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { rows } = (await request.json()) as { rows: ParsedVendorRow[] };

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const supabase = await createServiceClient();
    console.log("[vendors/upload] Supabase client created, rows:", rows.length);

    const vendorNames = [...new Set(rows.map((r) => r.vendor_name))];
    console.log("[vendors/upload] Calling Gemini to cluster", vendorNames.length, "vendor names");
    const clusters = await clusterVendorNames(vendorNames);
    console.log("[vendors/upload] Gemini clusters:", JSON.stringify(clusters));

    const vendorMap = new Map<string, string>();
    for (const [canonical, variants] of Object.entries(clusters)) {
      for (const variant of variants) {
        vendorMap.set(variant.toLowerCase(), canonical);
      }
    }

    const vendorSpend = new Map<
      string,
      { total: number; departments: Set<string>; category?: string; description?: string; rows: ParsedVendorRow[] }
    >();

    for (const row of rows) {
      const canonical =
        vendorMap.get(row.vendor_name.toLowerCase()) || row.vendor_name;
      const existing = vendorSpend.get(canonical) || {
        total: 0,
        departments: new Set<string>(),
        category: row.category,
        description: row.description,
        rows: [],
      };
      existing.total += row.amount;
      existing.departments.add(row.department);
      existing.rows.push(row);
      vendorSpend.set(canonical, existing);
    }

    const insertedVendors: Array<{ id: string; name: string }> = [];
    const clusterResults: Array<{
      canonical: string;
      variants: string[];
      accepted: boolean;
    }> = [];

    for (const [canonical, variants] of Object.entries(clusters)) {
      clusterResults.push({
        canonical,
        variants,
        accepted: false,
      });
    }

    for (const [name, data] of vendorSpend) {
      const departments = Array.from(data.departments);
      const { data: vendor, error } = await supabase
        .from("vendors")
        .upsert(
          {
            name,
            canonical_name: name,
            category: data.category || null,
            description: data.description || null,
            department: departments[0] || null,
            total_spend: data.total,
            annual_spend: data.total,
            is_active: true,
          },
          { onConflict: "name" }
        )
        .select("id, name")
        .single();

      if (error) {
        console.error(`[vendors/upload] Upsert failed for "${name}":`, error.message, error.code, error.details);
        continue;
      }

      if (vendor) {
        insertedVendors.push(vendor);

        for (const row of data.rows) {
          await supabase.from("spend_records").insert({
            vendor_id: vendor.id,
            amount: row.amount,
            department: row.department,
            period: row.period || new Date().getFullYear().toString(),
            description: row.description || null,
          });
        }

        try {
          const embeddingText = `Vendor: ${name}. Category: ${data.category || "Unknown"}. Description: ${data.description || name}. Department: ${departments.join(", ")}. Annual spend: $${data.total}`;
          const embedding = await getEmbedding(embeddingText);

          await supabase.from("vendor_embeddings").insert({
            vendor_id: vendor.id,
            content: embeddingText,
            embedding,
          });
        } catch {
          // Embedding generation failed — non-critical
        }
      }
    }

    console.log("[vendors/upload] Done. Vendors inserted:", insertedVendors.length);
    return NextResponse.json({
      success: true,
      vendorsProcessed: insertedVendors.length,
      clusters: clusterResults,
      vendors: insertedVendors,
    });
  } catch (err: unknown) {
    console.error("[vendors/upload] ERROR:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json({ error: message, stack }, { status: 500 });
  }
}
