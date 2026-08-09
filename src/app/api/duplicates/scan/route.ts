import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { detectDuplicateTools } from "@/lib/ai";

export async function POST() {
  try {
    const supabase = await createServiceClient();

    const { data: vendors, error: vendorError } = await supabase
      .from("vendors")
      .select("*")
      .eq("is_active", true);

    if (vendorError) throw vendorError;
    if (!vendors || vendors.length < 2) {
      return NextResponse.json({
        success: true,
        duplicates: [],
        message: "Need at least 2 vendors to scan for duplicates",
      });
    }

    const vendorInput = vendors.map((v) => ({
      name: v.name,
      description: v.description || v.category || v.name,
      category: v.category || "Unknown",
    }));

    const result = await detectDuplicateTools(vendorInput);

    // Clear old flagged duplicates
    await supabase.from("duplicate_groups").delete().eq("status", "flagged");

    const insertedGroups = [];
    for (const dup of result.duplicates || []) {
      const matchedVendors = vendors.filter((v) =>
        dup.tools.some(
          (t: string) => t.toLowerCase() === v.name.toLowerCase()
        )
      );
      const vendorIds = matchedVendors.map((v) => v.id);
      const vendorNames = matchedVendors.map((v) => v.name);
      const totalSpend = matchedVendors.reduce(
        (sum, v) => sum + (v.annual_spend || 0),
        0
      );

      if (vendorIds.length >= 2) {
        const { data: group } = await supabase
          .from("duplicate_groups")
          .insert({
            group_name: dup.group_name,
            vendor_ids: vendorIds,
            vendor_names: vendorNames,
            reason: dup.reason,
            estimated_overlap_pct: dup.estimated_overlap_spend_pct || 30,
            total_combined_spend: totalSpend,
            status: "flagged",
          })
          .select()
          .single();

        if (group) insertedGroups.push(group);
      }
    }

    return NextResponse.json({
      success: true,
      duplicates: insertedGroups,
      scannedVendors: vendors.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
