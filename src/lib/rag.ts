import type { SupabaseClient } from "@supabase/supabase-js";
import { getEmbedding } from "@/lib/ai";

export type KnowledgeSourceType = "vendor" | "contract";

export interface KnowledgeChunkInput {
  vendorId: string;
  contractId?: string | null;
  sourceType: KnowledgeSourceType;
  content: string;
  chunkIndex?: number;
}

export interface ContractForIndexing {
  id: string;
  vendor_id: string | null;
  file_name: string;
  renewal_date?: string | null;
  auto_renew?: boolean | null;
  notice_period_days?: number | null;
  contract_value?: number | null;
  pricing_escalation?: string | null;
  summary?: string | null;
  key_terms?: string[] | null;
  full_text?: string | null;
}

const DEFAULT_MAX_CHARS = 1000;
const DEFAULT_OVERLAP = 100;

export function chunkText(
  text: string,
  maxChars = DEFAULT_MAX_CHARS,
  overlap = DEFAULT_OVERLAP
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const paragraphs = trimmed.split(/\n\s*\n/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= maxChars) {
      current = current ? `${current}\n\n${para}` : para;
      continue;
    }

    if (current) {
      chunks.push(current);
      const tail = current.slice(-overlap);
      current = tail ? `${tail}\n\n${para}` : para;
    } else {
      let start = 0;
      while (start < para.length) {
        const end = Math.min(start + maxChars, para.length);
        chunks.push(para.slice(start, end));
        if (end >= para.length) break;
        start = end - overlap;
      }
      current = "";
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function buildVendorChunkText(vendor: {
  name: string;
  category?: string | null;
  description?: string | null;
  department?: string | null;
  annual_spend?: number | null;
}): string {
  return `Vendor: ${vendor.name}. Category: ${vendor.category || "Unknown"}. Description: ${vendor.description || vendor.name}. Department: ${vendor.department || "Unknown"}. Annual spend: $${vendor.annual_spend ?? 0}`;
}

export function buildContractChunkTexts(
  contract: ContractForIndexing,
  vendorName: string
): string[] {
  const keyTerms = Array.isArray(contract.key_terms)
    ? contract.key_terms.join("; ")
    : "";

  const metadata = [
    `Contract: ${contract.file_name}`,
    `Vendor: ${vendorName}`,
    contract.renewal_date ? `Renewal date: ${contract.renewal_date}` : null,
    contract.auto_renew != null ? `Auto-renew: ${contract.auto_renew}` : null,
    contract.notice_period_days != null
      ? `Notice period: ${contract.notice_period_days} days`
      : null,
    contract.contract_value != null
      ? `Annual value: $${contract.contract_value}`
      : null,
    contract.pricing_escalation
      ? `Pricing escalation: ${contract.pricing_escalation}`
      : null,
    contract.summary ? `Summary: ${contract.summary}` : null,
    keyTerms ? `Key terms: ${keyTerms}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return metadata ? [metadata] : [];
}

export function buildPdfChunkTexts(
  searchableText: string,
  vendorName: string,
  fileName: string
): string[] {
  const rawChunks = chunkText(searchableText);
  return rawChunks.map((chunk, i) =>
    `Vendor: ${vendorName} | Contract: ${fileName} | Section ${i + 1}\n${chunk}`
  );
}

export async function indexKnowledgeChunks(
  supabase: SupabaseClient,
  inputs: KnowledgeChunkInput[]
): Promise<void> {
  if (inputs.length === 0) return;

  const vendorIds = [...new Set(inputs.map((i) => i.vendorId))];
  const contractIds = [
    ...new Set(
      inputs.map((i) => i.contractId).filter((id): id is string => !!id)
    ),
  ];

  if (contractIds.length > 0) {
    await supabase
      .from("knowledge_chunks")
      .delete()
      .in("contract_id", contractIds);
  } else if (vendorIds.length === 1 && inputs.every((i) => i.sourceType === "vendor")) {
    await supabase
      .from("knowledge_chunks")
      .delete()
      .eq("vendor_id", vendorIds[0])
      .eq("source_type", "vendor");
  }

  const rows = [];
  for (const input of inputs) {
    const embedding = await getEmbedding(input.content);
    rows.push({
      vendor_id: input.vendorId,
      contract_id: input.contractId ?? null,
      content: input.content,
      embedding,
      chunk_index: input.chunkIndex ?? 0,
      source_type: input.sourceType,
    });
  }

  const { error } = await supabase.from("knowledge_chunks").insert(rows);
  if (error) throw error;
}

export async function indexVendor(
  supabase: SupabaseClient,
  vendor: {
    id: string;
    name: string;
    category?: string | null;
    description?: string | null;
    department?: string | null;
    annual_spend?: number | null;
  }
): Promise<void> {
  await indexKnowledgeChunks(supabase, [
    {
      vendorId: vendor.id,
      sourceType: "vendor",
      content: buildVendorChunkText(vendor),
      chunkIndex: 0,
    },
  ]);
}

export async function indexContract(
  supabase: SupabaseClient,
  contract: ContractForIndexing,
  vendorName: string,
  searchableText?: string | null
): Promise<void> {
  if (!contract.vendor_id) return;

  const inputs: KnowledgeChunkInput[] = [];
  const metadataChunks = buildContractChunkTexts(contract, vendorName);

  metadataChunks.forEach((content, i) => {
    inputs.push({
      vendorId: contract.vendor_id!,
      contractId: contract.id,
      sourceType: "contract",
      content,
      chunkIndex: i,
    });
  });

  const pdfText = searchableText ?? contract.full_text;
  if (pdfText?.trim()) {
    const pdfChunks = buildPdfChunkTexts(
      pdfText,
      vendorName,
      contract.file_name
    );
    const baseIndex = inputs.length;
    pdfChunks.forEach((content, i) => {
      inputs.push({
        vendorId: contract.vendor_id!,
        contractId: contract.id,
        sourceType: "contract",
        content,
        chunkIndex: baseIndex + i,
      });
    });
  }

  if (inputs.length === 0) return;
  await indexKnowledgeChunks(supabase, inputs);
}

export interface MatchedChunk {
  id: string;
  vendor_id: string | null;
  contract_id: string | null;
  content: string;
  source_type: string;
  similarity: number;
}

export function buildRetrievalQuery(
  question: string,
  history: Array<{ role: string; content: string }>
): string {
  if (history.length === 0) return question;
  const recent = history.slice(-6);
  const transcript = recent
    .map((t) => `${t.role}: ${t.content}`)
    .join("\n");
  return `${transcript}\nuser: ${question}`;
}

export function buildRetrievalContext(chunks: MatchedChunk[]): string {
  if (chunks.length === 0) return "";

  const parts: string[] = ["=== Retrieved Knowledge ==="];
  for (const chunk of chunks) {
    const label =
      chunk.source_type === "contract"
        ? `[contract${chunk.contract_id ? `:${chunk.contract_id.slice(0, 8)}` : ""}]`
        : `[vendor]`;
    parts.push(`${label} ${chunk.content}`);
  }
  return parts.join("\n");
}
