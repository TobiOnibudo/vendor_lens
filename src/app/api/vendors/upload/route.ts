import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { clusterVendorNames } from "@/lib/ai";
import { indexVendor } from "@/lib/rag";

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

    // Service client bypasses RLS for all writes (must be created first)
    const supabase = await createServiceClient();

    // Resolve the authenticated user who is performing the upload
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    let uploaderId: string | null = null;
    let uploaderName: string | null = null;
    if (user) {
      uploaderId = user.id;
      // Ensure a profile row exists; the signup trigger may not have fired.
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        uploaderName = profile.full_name || user.email || null;
      } else {
        // Profile missing: create it now so the FK on vendors.owner_id is satisfied.
        const fallbackName =
          (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Unknown";
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email ?? "",
            full_name: fallbackName,
            company_domain: user.email ? user.email.split("@")[1] : "",
          },
          { onConflict: "id" }
        );
        uploaderName = fallbackName;
      }
    }
    console.log("[vendors/upload] Supabase client created, rows:", rows.length, "uploader:", uploaderName);

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
      const newDepartments = Array.from(data.departments);

      // Fetch existing vendor to merge departments, aliases, and preserve owner
      const { data: existing } = await supabase
        .from("vendors")
        .select("id, department, owner_id, aliases")
        .eq("name", name)
        .maybeSingle();

      // Merge departments
      const existingDepts = existing?.department
        ? existing.department.split(",").map((d: string) => d.trim()).filter(Boolean)
        : [];
      const mergedDepts = [...new Set([...existingDepts, ...newDepartments])].sort();

      // Merge aliases: the canonical name itself is excluded, keep all non-canonical variants
      const incomingVariants = (clusters[name] as string[] | undefined) ?? [];
      const newAliases = incomingVariants.filter(
        (v) => v.toLowerCase() !== name.toLowerCase()
      );
      const existingAliases: string[] = Array.isArray(existing?.aliases)
        ? (existing.aliases as string[])
        : [];
      const mergedAliases = [
        ...new Set([...existingAliases, ...newAliases]),
      ].sort();

      // Only set owner if the vendor has no owner yet
      const ownerId = existing?.owner_id ?? uploaderId;
      const ownerName = existing?.owner_id ? undefined : uploaderName;

      const { data: vendor, error } = await supabase
        .from("vendors")
        .upsert(
          {
            name,
            canonical_name: name,
            category: data.category || null,
            description: data.description || null,
            department: mergedDepts.join(", ") || null,
            owner_id: ownerId,
            ...(ownerName !== undefined && { owner_name: ownerName }),
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

        // Save aliases separately so a missing column never blocks the main upsert
        if (mergedAliases.length > 0) {
          const { error: aliasError } = await supabase
            .from("vendors")
            .update({ aliases: mergedAliases })
            .eq("id", vendor.id);
          if (aliasError) {
            // PGRST204 means the column doesn't exist yet; safe to ignore until migrated.
            if (aliasError.code !== "PGRST204") {
              console.error(`[vendors/upload] Failed to save aliases for "${name}":`, aliasError.message);
            }
          }
        }

        for (const row of data.rows) {
          const { data: existingSpend } = await supabase
            .from("spend_records")
            .select("id")
            .eq("vendor_id", vendor.id)
            .eq("department", row.department)
            .eq("period", row.period || new Date().getFullYear().toString())
            .eq("amount", row.amount)
            .maybeSingle();

          if (!existingSpend) {
            await supabase.from("spend_records").insert({
              vendor_id: vendor.id,
              amount: row.amount,
              department: row.department,
              period: row.period || new Date().getFullYear().toString(),
              description: row.description || null,
            });
          }
        }

        try {
          await indexVendor(supabase, {
            id: vendor.id,
            name,
            category: data.category || null,
            description: data.description || null,
            department: mergedDepts.join(", ") || null,
            annual_spend: data.total,
          });
        } catch {
          // Embedding generation failed; non-critical.
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
