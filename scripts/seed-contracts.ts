/**
 * Seeds a representative set of confirmed contracts for the existing vendor
 * catalogue. Safe to re-run: records are identified by their seed file name.
 *
 * Usage: npm run seed:contracts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceKey);

type SeedContract = {
  vendor: string;
  slug: string;
  renewalDate: string;
  value: number;
  autoRenew: boolean;
  noticeDays: number;
  escalation: string;
  summary: string;
  keyTerms: string[];
};

const contracts: SeedContract[] = [
  { vendor: "Microsoft Azure", slug: "azure-enterprise-agreement", renewalDate: "2026-11-15", value: 22950, autoRenew: true, noticeDays: 30, escalation: "Usage-based; committed-spend tier retains a 15% discount.", summary: "Azure enterprise agreement covering compute, storage, networking, and premium support for Engineering.", keyTerms: ["30-day non-renewal notice", "15% committed-spend discount", "99.95% compute SLA"] },
  { vendor: "Slack", slug: "slack-business-plus", renewalDate: "2026-11-30", value: 6600, autoRenew: true, noticeDays: 30, escalation: "5% annual increase at renewal.", summary: "Business+ collaboration subscription with SSO, audit exports, and enterprise support.", keyTerms: ["30-day non-renewal notice", "SAML SSO included", "99.99% uptime SLA"] },
  { vendor: "GitHub", slug: "github-enterprise", renewalDate: "2026-12-15", value: 4800, autoRenew: true, noticeDays: 30, escalation: "Pricing is locked for the current renewal term.", summary: "GitHub Enterprise subscription including Actions and Advanced Security for Engineering.", keyTerms: ["30-day non-renewal notice", "Advanced Security included", "50,000 Actions minutes per month"] },
  { vendor: "HubSpot", slug: "hubspot-marketing-hub", renewalDate: "2027-01-31", value: 12000, autoRenew: true, noticeDays: 60, escalation: "4% annual escalation; added contacts are billed separately.", summary: "Marketing Hub Professional subscription supporting campaign automation and CRM integrations.", keyTerms: ["60-day non-renewal notice", "10,000 contacts included", "4% annual escalation"] },
  { vendor: "Okta", slug: "okta-workforce-identity", renewalDate: "2027-01-31", value: 7500, autoRenew: true, noticeDays: 60, escalation: "Per-user pricing subject to annual true-up.", summary: "Workforce identity platform covering SSO, lifecycle management, and MFA.", keyTerms: ["60-day non-renewal notice", "Annual user true-up", "MFA included"] },
  { vendor: "Notion", slug: "notion-business", renewalDate: "2027-02-28", value: 1800, autoRenew: true, noticeDays: 14, escalation: "Per-seat pricing; mid-term additions are prorated.", summary: "Notion Business workspace for documentation, planning, and team knowledge management.", keyTerms: ["14-day non-renewal notice", "SAML SSO included", "90-day version history"] },
  { vendor: "Figma", slug: "figma-organization", renewalDate: "2027-02-28", value: 2400, autoRenew: false, noticeDays: 30, escalation: "Fixed price; renegotiate for additional editor seats.", summary: "Figma Organization plan for design systems, prototyping, and developer handoff.", keyTerms: ["Manual renewal required", "5 editor seats", "Organization libraries included"] },
  { vendor: "Stripe", slug: "stripe-payments", renewalDate: "2027-03-31", value: 8200, autoRenew: true, noticeDays: 60, escalation: "Transaction-based pricing at the negotiated rate.", summary: "Payments agreement covering card processing, Billing, Radar, and support.", keyTerms: ["60-day non-renewal notice", "Negotiated processing rate", "PCI DSS Level 1"] },
  { vendor: "Rippling", slug: "rippling-hr-payroll", renewalDate: "2027-03-31", value: 9200, autoRenew: true, noticeDays: 60, escalation: "Per-employee-per-month pricing; annual headcount review applies.", summary: "HR, payroll, benefits, and device-management platform for People Operations.", keyTerms: ["60-day non-renewal notice", "Annual headcount review", "Payroll emergency support"] },
  { vendor: "Zoom", slug: "zoom-business", renewalDate: "2027-04-30", value: 4400, autoRenew: false, noticeDays: 30, escalation: "Fixed price; pricing continuity requires manual renewal.", summary: "Zoom Business plan with cloud recording, webinars, and managed domains.", keyTerms: ["Manual renewal required", "1 TB recording storage", "Webinar add-on included"] },
  { vendor: "Atlassian", slug: "atlassian-cloud", renewalDate: "2027-05-31", value: 4700, autoRenew: true, noticeDays: 30, escalation: "5% annual increase under standard cloud terms.", summary: "Atlassian Cloud subscription supporting Jira and Confluence for product delivery.", keyTerms: ["30-day non-renewal notice", "Jira and Confluence included", "99.9% uptime SLA"] },
  { vendor: "PagerDuty", slug: "pagerduty-operations-cloud", renewalDate: "2027-06-30", value: 2200, autoRenew: true, noticeDays: 30, escalation: "5% annual increase at renewal.", summary: "Incident-management subscription with on-call scheduling, escalation policies, and analytics.", keyTerms: ["30-day non-renewal notice", "24/7 incident routing", "Quarterly service review"] },
  { vendor: "Intercom", slug: "intercom-customer-service", renewalDate: "2027-06-30", value: 4200, autoRenew: true, noticeDays: 30, escalation: "Seat and usage pricing reviewed at renewal.", summary: "Customer service platform with messaging, support inbox, and help-center tooling.", keyTerms: ["30-day non-renewal notice", "Usage-based overages", "Customer data export available"] },
  { vendor: "DocuSign", slug: "docusign-business-pro", renewalDate: "2027-07-31", value: 2800, autoRenew: false, noticeDays: 30, escalation: "Fixed annual fee; envelope overages are billed separately.", summary: "Electronic-signature agreement for Legal and Finance with Salesforce integration.", keyTerms: ["Manual renewal required", "2,500 envelopes per year", "Audit trail included"] },
  { vendor: "Adobe", slug: "adobe-creative-cloud", renewalDate: "2027-08-31", value: 6500, autoRenew: true, noticeDays: 30, escalation: "3% annual increase; VIP tier pricing maintained.", summary: "Creative Cloud licensing for Marketing and Design, including centralized administration.", keyTerms: ["30-day non-renewal notice", "All Apps licenses", "Admin console included"] },
  { vendor: "Greenhouse", slug: "greenhouse-recruiting", renewalDate: "2027-08-31", value: 5500, autoRenew: true, noticeDays: 60, escalation: "5% annual increase; additional recruiter seats are separate.", summary: "Applicant-tracking subscription with interview planning, reporting, and HRIS integrations.", keyTerms: ["60-day non-renewal notice", "HRIS integration included", "Candidate-data export available"] },
  { vendor: "Zendesk", slug: "zendesk-suite", renewalDate: "2027-09-30", value: 3800, autoRenew: true, noticeDays: 30, escalation: "5% annual increase; agent count reviewed at renewal.", summary: "Zendesk Suite subscription for customer support, ticketing, and reporting.", keyTerms: ["30-day non-renewal notice", "Agent count true-up", "99.9% uptime SLA"] },
  { vendor: "Snowflake", slug: "snowflake-capacity", renewalDate: "2027-10-31", value: 14500, autoRenew: true, noticeDays: 60, escalation: "Consumption commitment is re-priced at renewal.", summary: "Snowflake data-cloud capacity commitment for analytics and reporting workloads.", keyTerms: ["60-day non-renewal notice", "Annual capacity commitment", "Usage monitoring included"] },
  { vendor: "Twilio", slug: "twilio-communications", renewalDate: "2027-12-31", value: 3400, autoRenew: false, noticeDays: 30, escalation: "Usage-based; committed spend unlocks volume discounts.", summary: "Messaging and voice API agreement with committed annual spend for Engineering.", keyTerms: ["Manual renewal required", "Annual spend commitment", "24/7 support"] },
];

async function main() {
  const { data: vendors, error: vendorError } = await supabase
    .from("vendors")
    .select("id, name");
  if (vendorError) throw vendorError;

  const vendorIds = new Map((vendors ?? []).map((vendor) => [vendor.name, vendor.id]));
  const fileNames = contracts.map((contract) => `seed-2026-${contract.slug}.pdf`);
  const { data: existing, error: existingError } = await supabase
    .from("contracts")
    .select("file_name")
    .in("file_name", fileNames);
  if (existingError) throw existingError;

  const existingNames = new Set((existing ?? []).map((contract) => contract.file_name));
  const rows = contracts
    .filter((contract) => !existingNames.has(`seed-2026-${contract.slug}.pdf`))
    .map((contract) => {
      const vendorId = vendorIds.get(contract.vendor);
      if (!vendorId) throw new Error(`Missing vendor: ${contract.vendor}`);

      return {
        vendor_id: vendorId,
        file_name: `seed-2026-${contract.slug}.pdf`,
        start_date: "2026-01-01",
        renewal_date: contract.renewalDate,
        auto_renew: contract.autoRenew,
        notice_period_days: contract.noticeDays,
        contract_value: contract.value,
        pricing_escalation: contract.escalation,
        summary: contract.summary,
        key_terms: contract.keyTerms,
        full_text: `${contract.summary}\n\nRenewal date: ${contract.renewalDate}. ${contract.autoRenew ? `The agreement automatically renews unless written non-renewal notice is submitted ${contract.noticeDays} days before renewal.` : "The agreement does not automatically renew and requires a manual renewal decision."}\n\nPricing: ${contract.escalation}\n\nKey terms: ${contract.keyTerms.join("; ")}.`,
        status: "confirmed",
        extracted_at: new Date().toISOString(),
      };
    });

  if (rows.length === 0) {
    console.log("Sample contracts are already seeded.");
    return;
  }

  const { error: insertError } = await supabase.from("contracts").insert(rows);
  if (insertError) throw insertError;

  console.log(`Seeded ${rows.length} contracts.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
