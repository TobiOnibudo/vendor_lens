import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getEmbedding, chatWithData } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    console.log("[search] Question:", question);
    const supabase = await createServiceClient();

    // Get embedding for the question
    console.log("[search] Generating embedding...");
    const queryEmbedding = await getEmbedding(question);
    console.log("[search] Embedding length:", queryEmbedding.length);

    // Semantic search against vendor embeddings
    console.log("[search] Running semantic search...");
    const { data: semanticResults, error: rpcError } = await supabase.rpc("match_vendors", {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 10,
    });
    if (rpcError) console.error("[search] match_vendors RPC error:", rpcError.message, rpcError.code);
    console.log("[search] Semantic results:", semanticResults?.length ?? 0);

    // Also fetch all vendors and contracts for context enrichment
    console.log("[search] Fetching vendors, contracts, duplicates...");
    const [vendorRes, contractRes, duplicateRes] = await Promise.all([
      supabase.from("vendors").select("*").eq("is_active", true),
      supabase.from("contracts").select("*, vendors(name)"),
      supabase.from("duplicate_groups").select("*").eq("status", "flagged"),
    ]);
    if (vendorRes.error) console.error("[search] vendors error:", vendorRes.error.message);
    if (contractRes.error) console.error("[search] contracts error:", contractRes.error.message);
    console.log("[search] Vendors:", vendorRes.data?.length ?? 0, "| Contracts:", contractRes.data?.length ?? 0);

    const vendors = vendorRes.data || [];
    const contracts = contractRes.data || [];
    const duplicates = duplicateRes.data || [];

    // Build context for AI
    const contextParts: string[] = [];

    // Add semantic search results
    if (semanticResults && semanticResults.length > 0) {
      contextParts.push("=== Most Relevant Vendors (by AI similarity) ===");
      for (const result of semanticResults) {
        contextParts.push(result.content);
      }
    }

    // Add all vendor data
    contextParts.push("\n=== All Vendors ===");
    for (const v of vendors) {
      contextParts.push(
        `- ${v.name} | Category: ${v.category || "Unknown"} | Dept: ${v.department || "Unknown"} | Annual Spend: $${v.annual_spend || 0} | Owner: ${v.owner_name || "Unknown"}`
      );
    }

    // Add contract data
    contextParts.push("\n=== Contracts ===");
    for (const c of contracts) {
      const vendorName = c.vendors?.name || "Unknown Vendor";
      contextParts.push(
        `- ${vendorName}: Renewal ${c.renewal_date || "Unknown"} | Auto-Renew: ${c.auto_renew ?? "Unknown"} | Value: $${c.contract_value || "Unknown"} | Notice: ${c.notice_period_days ? c.notice_period_days + " days" : "Unknown"} | Status: ${c.status}`
      );
      if (c.summary) {
        contextParts.push(`  Summary: ${c.summary}`);
      }
    }

    // Add duplicate groups
    if (duplicates.length > 0) {
      contextParts.push("\n=== Flagged Duplicate/Overlapping Tools ===");
      for (const d of duplicates) {
        contextParts.push(
          `- ${d.group_name}: ${(d.vendor_names as string[]).join(", ")} | ${d.reason} | Overlap: ${d.estimated_overlap_pct}%`
        );
      }
    }

    const context = contextParts.join("\n");

    console.log("[search] Calling Gemini chat...");
    const answer = await chatWithData(question, context);
    console.log("[search] Done.");

    return NextResponse.json({
      success: true,
      answer,
      sources: {
        vendorsFound: semanticResults?.length || 0,
        totalVendors: vendors.length,
        totalContracts: contracts.length,
        duplicateGroups: duplicates.length,
      },
    });
  } catch (err: unknown) {
    console.error("[search] ERROR:", err);
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
