import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API key must be set when using the Gemini API.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const EMBEDDING_DIMENSIONS = 768;

export async function getEmbedding(text: string): Promise<number[]> {
  const result = await getGeminiClient().models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  const values = result.embeddings![0].values!;
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS}-dim embedding, got ${values.length}`
    );
  }
  return values;
}

export async function extractContractData(
  source: string | { data: string; mimeType: string }
) {
  const prompt = `You are a contract analysis expert. Extract structured data from this contract document.
Return a JSON object with these fields:
- vendor_name: the name of the vendor/supplier party (not the customer), as it appears in the contract, or null
- renewal_date: ISO date string (YYYY-MM-DD) or null
- auto_renew: boolean or null
- notice_period_days: number or null
- contract_value: number (annual, in USD) or null
- pricing_escalation: string description or null
- summary: 2-3 sentence summary of the contract
- key_terms: array of important terms/clauses as short strings
- searchable_text: plain-text condensation of the full contract for search indexing (max 8000 characters; include key clauses, dates, fees, and obligations)

Only include data you can confidently extract. Use null for uncertain fields.`;

  const contents =
    typeof source === "string"
      ? `${prompt}\n\nExtract from this text:\n\n${source}`
      : [
          { text: prompt },
          { inlineData: { mimeType: source.mimeType, data: source.data } },
        ];

  const result = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: { responseMimeType: "application/json" },
  });

  return JSON.parse(result.text!);
}

export async function clusterVendorNames(
  vendors: string[]
): Promise<Record<string, string[]>> {
  const result = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are a data cleaning expert. Given a list of vendor names, identify duplicates and variations of the same company.
Return a JSON object where keys are the canonical (clean) vendor name and values are arrays of all name variations that map to it.
Only group names that clearly refer to the same vendor. Leave unique vendors as single-item arrays.

Cluster these vendor names:
${vendors.join("\n")}`,
    config: { responseMimeType: "application/json" },
  });

  return JSON.parse(result.text!);
}

export async function detectDuplicateTools(
  vendors: Array<{ name: string; description: string; category: string }>
) {
  const result = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are a software procurement analyst. Analyze the list of vendor tools and identify potential duplicates or overlapping functionality.
Return a JSON object with:
- duplicates: array of objects with { group_name, tools: string[], reason, estimated_overlap_spend_pct }
Each group represents tools that might overlap in functionality.

Analyze these tools for overlap:
${JSON.stringify(vendors, null, 2)}`,
    config: { responseMimeType: "application/json" },
  });

  return JSON.parse(result.text!);
}

export type ChatTurn = { role: "user" | "assistant"; content: string };
