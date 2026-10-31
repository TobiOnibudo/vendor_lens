/**
 * One-off backfill: index all active vendors and contracts into knowledge_chunks.
 *
 * Usage:
 *   npm run backfill:knowledge
 *
 * Requires OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load env before importing modules that use OPENAI_API_KEY.
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const { indexVendor, indexContract } = await import("../src/lib/rag");

  console.log("Backfilling vendor knowledge chunks...");

  const { data: vendors, error: vendorError } = await supabase
    .from("vendors")
    .select("id, name, category, description, department, annual_spend")
    .eq("is_active", true);

  if (vendorError) throw vendorError;

  let vendorCount = 0;
  for (const vendor of vendors || []) {
    try {
      await indexVendor(supabase, vendor);
      vendorCount++;
      console.log(`  Indexed vendor: ${vendor.name}`);
    } catch (err) {
      console.error(`  Failed vendor ${vendor.name}:`, err);
    }
  }

  console.log(`\nBackfilling contract knowledge chunks...`);

  const { data: contracts, error: contractError } = await supabase
    .from("contracts")
    .select(
      "id, vendor_id, file_name, renewal_date, auto_renew, notice_period_days, contract_value, pricing_escalation, summary, key_terms, full_text, vendors(name)"
    )
    .not("vendor_id", "is", null);

  if (contractError) throw contractError;

  let contractCount = 0;
  for (const contract of contracts || []) {
    const vendorName =
      (contract.vendors as { name?: string } | null)?.name || "Unknown Vendor";

    try {
      await indexContract(
        supabase,
        {
          id: contract.id,
          vendor_id: contract.vendor_id,
          file_name: contract.file_name,
          renewal_date: contract.renewal_date,
          auto_renew: contract.auto_renew,
          notice_period_days: contract.notice_period_days,
          contract_value: contract.contract_value,
          pricing_escalation: contract.pricing_escalation,
          summary: contract.summary,
          key_terms: contract.key_terms as string[] | null,
          full_text: contract.full_text,
        },
        vendorName
      );
      contractCount++;
      console.log(`  Indexed contract: ${contract.file_name}`);
    } catch (err) {
      console.error(`  Failed contract ${contract.file_name}:`, err);
    }
  }

  const { count } = await supabase
    .from("knowledge_chunks")
    .select("id", { count: "exact", head: true });

  console.log(
    `\nDone. Indexed ${vendorCount} vendors and ${contractCount} contracts.`
  );
  console.log(`Total rows in knowledge_chunks: ${count ?? "unknown"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
