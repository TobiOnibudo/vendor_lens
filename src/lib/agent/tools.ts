import { tool } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getEmbedding } from "@/lib/ai";
import { buildRetrievalContext, type MatchedChunk } from "@/lib/rag";

export type ToolExecutionMeta = { toolsCalled: string[]; chunksRetrieved: number };

export function createAgentTools(supabase: SupabaseClient, meta: ToolExecutionMeta) {
  return {
    search_knowledge: tool({
      description: "Semantic search over indexed vendor and contract knowledge. Use for questions about specific vendors, contract terms, categories, or capabilities.",
      inputSchema: z.object({
        query: z.string().describe("Search query with vendor names and intent."),
        match_count: z.number().int().optional().describe("Maximum chunks to return."),
      }),
      execute: (args) => searchKnowledge(supabase, args, meta),
    }),
    list_vendors: tool({
      description: "List active vendors with spend and metadata.",
      inputSchema: z.object({
        department: z.string().optional(),
        category: z.string().optional(),
        limit: z.number().int().optional(),
        order_by: z.enum(["annual_spend", "name"]).optional(),
      }),
      execute: (args) => listVendors(supabase, args, meta),
    }),
    list_contracts: tool({
      description: "List contracts with renewal dates, values, and auto-renew status.",
      inputSchema: z.object({
        vendor_name: z.string().optional(),
        renewing_within_days: z.number().int().optional(),
        limit: z.number().int().optional(),
      }),
      execute: (args) => listContracts(supabase, args, meta),
    }),
    list_duplicate_groups: tool({
      description: "List flagged duplicate or overlapping software tools.",
      inputSchema: z.object({ limit: z.number().int().optional() }),
      execute: (args) => listDuplicateGroups(supabase, args, meta),
    }),
  };
}

async function searchKnowledge(
  supabase: SupabaseClient,
  args: { query: string; match_count?: number },
  meta: ToolExecutionMeta
): Promise<Record<string, unknown>> {
  meta.toolsCalled.push("search_knowledge");
  const query = args.query.trim();
  if (!query) return { error: "query is required" };
  const queryEmbedding = await getEmbedding(query);
  const { data, error } = await supabase.rpc("match_knowledge_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: 0.45,
    match_count: args.match_count ?? 12,
  });
  if (error) return { error: error.message };

  const chunks = (data || []) as MatchedChunk[];
  meta.chunksRetrieved += chunks.length;
  const matchedVendorIds = [...new Set(chunks.map((chunk) => chunk.vendor_id).filter(Boolean))] as string[];
  let duplicateSection = "";
  if (matchedVendorIds.length > 0) {
    const { data: allDuplicates } = await supabase.from("duplicate_groups").select("*").eq("status", "flagged");
    const relevant = (allDuplicates || []).filter((group) =>
      ((group.vendor_ids as string[]) || []).some((id) => matchedVendorIds.includes(id))
    );
    if (relevant.length > 0) {
      duplicateSection = relevant
        .map((group) => `${group.group_name}: ${(group.vendor_names as string[]).join(", ")} - ${group.reason}`)
        .join("\n");
    }
  }
  let context = buildRetrievalContext(chunks);
  if (duplicateSection) context += `\n\nRelated overlaps:\n${duplicateSection}`;
  return {
    chunk_count: chunks.length,
    context: context || "No matching knowledge found.",
    chunks: chunks.map((chunk) => ({
      source_type: chunk.source_type,
      similarity: chunk.similarity,
      content: chunk.content,
    })),
  };
}

async function listVendors(
  supabase: SupabaseClient,
  args: { department?: string; category?: string; limit?: number; order_by?: "annual_spend" | "name" },
  meta: ToolExecutionMeta
): Promise<Record<string, unknown>> {
  meta.toolsCalled.push("list_vendors");
  const orderBy = args.order_by ?? "annual_spend";
  let query = supabase.from("vendors").select("name, category, department, annual_spend, owner_name, description")
    .eq("is_active", true).order(orderBy, { ascending: orderBy === "name" }).limit(args.limit ?? 15);
  if (args.department) query = query.ilike("department", `%${args.department}%`);
  if (args.category) query = query.ilike("category", `%${args.category}%`);
  const { data, error } = await query;
  return error ? { error: error.message } : { vendors: data || [], count: data?.length ?? 0 };
}

async function listContracts(
  supabase: SupabaseClient,
  args: { vendor_name?: string; renewing_within_days?: number; limit?: number },
  meta: ToolExecutionMeta
): Promise<Record<string, unknown>> {
  meta.toolsCalled.push("list_contracts");
  let vendorIds: string[] | null = null;
  if (args.vendor_name) {
    const { data: vendors } = await supabase.from("vendors").select("id").ilike("name", `%${args.vendor_name}%`).eq("is_active", true);
    vendorIds = vendors?.map((vendor) => vendor.id) ?? [];
    if (vendorIds.length === 0) return { contracts: [], count: 0 };
  }
  let query = supabase.from("contracts")
    .select("file_name, renewal_date, auto_renew, notice_period_days, contract_value, status, summary, vendors(name)")
    .order("renewal_date", { ascending: true }).limit(args.limit ?? 15);
  if (vendorIds) query = query.in("vendor_id", vendorIds);
  if (args.renewing_within_days !== undefined) {
    const today = new Date().toISOString().split("T")[0];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + args.renewing_within_days);
    query = query.gte("renewal_date", today).lte("renewal_date", cutoff.toISOString().split("T")[0]);
  }
  const { data, error } = await query;
  if (error) return { error: error.message };
  return {
    contracts: (data || []).map((contract) => ({
      vendor: (contract.vendors as { name?: string } | null)?.name ?? "Unknown",
      file_name: contract.file_name,
      renewal_date: contract.renewal_date,
      auto_renew: contract.auto_renew,
      notice_period_days: contract.notice_period_days,
      contract_value: contract.contract_value,
      status: contract.status,
      summary: contract.summary,
    })),
    count: data?.length ?? 0,
  };
}

async function listDuplicateGroups(
  supabase: SupabaseClient,
  args: { limit?: number },
  meta: ToolExecutionMeta
): Promise<Record<string, unknown>> {
  meta.toolsCalled.push("list_duplicate_groups");
  const { data, error } = await supabase.from("duplicate_groups")
    .select("group_name, vendor_names, reason, estimated_overlap_pct, total_combined_spend")
    .eq("status", "flagged").limit(args.limit ?? 20);
  return error ? { error: error.message } : { groups: data || [], count: data?.length ?? 0 };
}
