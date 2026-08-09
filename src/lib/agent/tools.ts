import type { SupabaseClient } from "@supabase/supabase-js";
import type { FunctionDeclaration } from "@google/genai";
import { getEmbedding } from "@/lib/ai";
import {
  buildRetrievalContext,
  type MatchedChunk,
} from "@/lib/rag";

export const AGENT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_knowledge",
    description:
      "Semantic search over indexed vendor and contract knowledge. Use for questions about specific tools, renewals, contract terms, categories, or capabilities.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query; include vendor names and intent from the conversation.",
        },
        match_count: {
          type: "integer",
          description: "Max chunks to return (default 12).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_vendors",
    description:
      "List active vendors with spend and metadata. Use for rankings, department filters, or browsing the portfolio.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        department: {
          type: "string",
          description: "Filter by department (partial match).",
        },
        category: {
          type: "string",
          description: "Filter by category (partial match).",
        },
        limit: {
          type: "integer",
          description: "Max rows (default 15).",
        },
        order_by: {
          type: "string",
          enum: ["annual_spend", "name"],
          description: "Sort field (default annual_spend).",
        },
      },
    },
  },
  {
    name: "list_contracts",
    description:
      "List contracts with renewal and value fields. Use for renewal timelines, auto-renew, or contract lookups.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        vendor_name: {
          type: "string",
          description: "Filter by vendor name (partial match).",
        },
        renewing_within_days: {
          type: "integer",
          description: "Only contracts renewing within this many days from today.",
        },
        limit: {
          type: "integer",
          description: "Max rows (default 15).",
        },
      },
    },
  },
  {
    name: "list_duplicate_groups",
    description:
      "List flagged duplicate or overlapping software tools with reasons and overlap estimates.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max groups (default 20)." },
      },
    },
  },
];

export type ToolExecutionMeta = {
  toolsCalled: string[];
  chunksRetrieved: number;
};

export async function executeAgentTool(
  supabase: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
  meta: ToolExecutionMeta
): Promise<Record<string, unknown>> {
  meta.toolsCalled.push(name);

  switch (name) {
    case "search_knowledge":
      return searchKnowledge(supabase, args, meta);
    case "list_vendors":
      return listVendors(supabase, args);
    case "list_contracts":
      return listContracts(supabase, args);
    case "list_duplicate_groups":
      return listDuplicateGroups(supabase, args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function searchKnowledge(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
  meta: ToolExecutionMeta
): Promise<Record<string, unknown>> {
  const query = String(args.query || "").trim();
  if (!query) return { error: "query is required" };

  const matchCount =
    typeof args.match_count === "number" ? args.match_count : 12;

  const queryEmbedding = await getEmbedding(query);
  const { data, error } = await supabase.rpc("match_knowledge_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: 0.45,
    match_count: matchCount,
  });

  if (error) return { error: error.message };

  const chunks = (data || []) as MatchedChunk[];
  meta.chunksRetrieved += chunks.length;

  const matchedVendorIds = [
    ...new Set(chunks.map((c) => c.vendor_id).filter(Boolean)),
  ] as string[];

  let duplicateSection = "";
  if (matchedVendorIds.length > 0) {
    const { data: allDuplicates } = await supabase
      .from("duplicate_groups")
      .select("*")
      .eq("status", "flagged");

    const relevant = (allDuplicates || []).filter((d) => {
      const ids = (d.vendor_ids as string[]) || [];
      return ids.some((id) => matchedVendorIds.includes(id));
    });

    if (relevant.length > 0) {
      duplicateSection = relevant
        .map(
          (d) =>
            `${d.group_name}: ${(d.vendor_names as string[]).join(", ")} — ${d.reason}`
        )
        .join("\n");
    }
  }

  let context = buildRetrievalContext(chunks);
  if (duplicateSection) {
    context += `\n\nRelated overlaps:\n${duplicateSection}`;
  }

  return {
    chunk_count: chunks.length,
    context: context || "No matching knowledge found.",
    chunks: chunks.map((c) => ({
      source_type: c.source_type,
      similarity: c.similarity,
      content: c.content,
    })),
  };
}

async function listVendors(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const limit = typeof args.limit === "number" ? args.limit : 15;
  const orderBy = args.order_by === "name" ? "name" : "annual_spend";

  let q = supabase
    .from("vendors")
    .select("name, category, department, annual_spend, owner_name, description")
    .eq("is_active", true)
    .order(orderBy, { ascending: orderBy === "name" })
    .limit(limit);

  if (args.department) {
    q = q.ilike("department", `%${args.department}%`);
  }
  if (args.category) {
    q = q.ilike("category", `%${args.category}%`);
  }

  const { data, error } = await q;
  if (error) return { error: error.message };
  return { vendors: data || [], count: data?.length ?? 0 };
}

async function listContracts(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const limit = typeof args.limit === "number" ? args.limit : 15;

  let vendorIds: string[] | null = null;
  if (args.vendor_name) {
    const { data: vendors } = await supabase
      .from("vendors")
      .select("id")
      .ilike("name", `%${args.vendor_name}%`)
      .eq("is_active", true);
    vendorIds = vendors?.map((v) => v.id) ?? [];
    if (vendorIds.length === 0) {
      return { contracts: [], count: 0 };
    }
  }

  let q = supabase
    .from("contracts")
    .select(
      "file_name, renewal_date, auto_renew, notice_period_days, contract_value, status, summary, vendors(name)"
    )
    .order("renewal_date", { ascending: true })
    .limit(limit);

  if (vendorIds) {
    q = q.in("vendor_id", vendorIds);
  }

  if (typeof args.renewing_within_days === "number") {
    const today = new Date().toISOString().split("T")[0];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + args.renewing_within_days);
    q = q
      .gte("renewal_date", today)
      .lte("renewal_date", cutoff.toISOString().split("T")[0]);
  }

  const { data, error } = await q;
  if (error) return { error: error.message };

  const contracts = data || [];

  return {
    contracts: contracts.map((c) => ({
      vendor: (c.vendors as { name?: string } | null)?.name ?? "Unknown",
      file_name: c.file_name,
      renewal_date: c.renewal_date,
      auto_renew: c.auto_renew,
      notice_period_days: c.notice_period_days,
      contract_value: c.contract_value,
      status: c.status,
      summary: c.summary,
    })),
    count: contracts.length,
  };
}

async function listDuplicateGroups(
  supabase: SupabaseClient,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const limit = typeof args.limit === "number" ? args.limit : 20;

  const { data, error } = await supabase
    .from("duplicate_groups")
    .select(
      "group_name, vendor_names, reason, estimated_overlap_pct, total_combined_spend"
    )
    .eq("status", "flagged")
    .limit(limit);

  if (error) return { error: error.message };
  return { groups: data || [], count: data?.length ?? 0 };
}
