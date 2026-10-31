import { openai } from "@ai-sdk/openai";
import { embed, generateText, Output } from "ai";
import { z } from "zod";

const CHAT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const EMBEDDING_DIMENSIONS = 768;

function getModel() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY must be set to use VendorLens AI.");
  }
  return openai(CHAT_MODEL);
}

export async function getEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embeddingModel("text-embedding-3-small"),
    value: text,
    providerOptions: { openai: { dimensions: EMBEDDING_DIMENSIONS } },
  });
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS}-dim embedding, got ${embedding.length}`);
  }
  return embedding;
}

const contractSchema = z.object({
  vendor_name: z.string().nullable(),
  renewal_date: z.string().nullable(),
  auto_renew: z.boolean().nullable(),
  notice_period_days: z.number().nullable(),
  contract_value: z.number().nullable(),
  pricing_escalation: z.string().nullable(),
  summary: z.string().nullable(),
  key_terms: z.array(z.string()),
  searchable_text: z.string().nullable(),
});

export type ContractExtraction = z.infer<typeof contractSchema>;

export async function extractContractData(
  source: string | { data: string; mimeType: string }
): Promise<ContractExtraction> {
  const prompt = `You are a contract analysis expert. Extract structured data from this contract document.
Only include data you can confidently extract. Use null for uncertain scalar values.

For searchable_text, create a plain-text condensation of the full contract (maximum 8,000 characters) that includes key clauses, dates, fees, and obligations.`;
  const result = await generateText({
    model: getModel(),
    output: Output.object({ schema: contractSchema }),
    messages:
      typeof source === "string"
        ? [{ role: "user", content: `${prompt}\n\nExtract from this text:\n\n${source}` }]
        : [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "file",
                mediaType: source.mimeType,
                data: Buffer.from(source.data, "base64"),
                filename: "contract.pdf",
              },
            ],
          }],
  });
  if (!result.output) throw new Error("No structured contract data was generated.");
  return result.output;
}

const vendorClustersSchema = z.record(z.string(), z.array(z.string()));

export async function clusterVendorNames(vendors: string[]): Promise<Record<string, string[]>> {
  const result = await generateText({
    model: getModel(),
    output: Output.object({ schema: vendorClustersSchema }),
    prompt: `You are a data-cleaning expert. Given a list of vendor names, identify duplicates and variations of the same company.
Return an object where keys are canonical vendor names and values are every name variation that maps to them. Only group names that clearly refer to the same vendor. Leave unique vendors as single-item arrays.

Vendor names:\n${vendors.join("\n")}`,
  });
  if (!result.output) throw new Error("No vendor clusters were generated.");
  return result.output;
}

const duplicateToolsSchema = z.object({
  duplicates: z.array(z.object({
    group_name: z.string(),
    tools: z.array(z.string()),
    reason: z.string(),
    estimated_overlap_spend_pct: z.number(),
  })),
});

export async function detectDuplicateTools(
  vendors: Array<{ name: string; description: string; category: string }>
) {
  const result = await generateText({
    model: getModel(),
    output: Output.object({ schema: duplicateToolsSchema }),
    prompt: `You are a software procurement analyst. Analyze the list of vendor tools and identify potential duplicates or overlapping functionality.

Analyze these tools for overlap:\n${JSON.stringify(vendors, null, 2)}`,
  });
  if (!result.output) throw new Error("No duplicate-tool analysis was generated.");
  return result.output;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };
