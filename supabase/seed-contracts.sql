-- =============================================================================
-- VendorLens AI - Sample Contract Seed Data
-- Run this AFTER uploading vendors.csv and the AI merge step.
-- Vendors are looked up by their canonical name from the vendors table.
-- =============================================================================

insert into contracts (
  vendor_id, file_name, renewal_date, auto_renew, notice_period_days,
  contract_value, pricing_escalation, summary, key_terms, status, extracted_at
)
select
  v.id,
  c.file_name,
  c.renewal_date::date,
  c.auto_renew,
  c.notice_period_days,
  c.contract_value,
  c.pricing_escalation,
  c.summary,
  c.key_terms::jsonb,
  c.status,
  now()
from vendors v
join (values

  -- Salesforce
  (
    'Salesforce',
    'salesforce-enterprise-2025.pdf',
    '2025-09-30', true, 60, 24500.00,
    '3% annual escalation on base license fees',
    'Enterprise license for CRM and Sales Cloud. Covers up to 50 named users in the Sales department with unlimited API calls and 24/7 premium support.',
    '[
      "50 named user licenses for Sales Cloud Enterprise",
      "24/7 Premier Success Plan support",
      "Unlimited API calls included",
      "30-day implementation support included",
      "Data export rights upon termination",
      "SLA: 99.9% uptime guarantee"
    ]',
    'confirmed'
  ),

  -- Microsoft Azure
  (
    'Microsoft Azure',
    'microsoft-azure-ea-2025.pdf',
    '2025-12-31', true, 30, 18750.00,
    'Usage-based; committed spend tier unlocks 15% discount',
    'Enterprise Agreement for Azure cloud compute, storage, and networking. Includes a $18,750 annual commitment with pay-as-you-go overage billed monthly.',
    '[
      "$18,750 annual committed spend",
      "15% discount on listed pricing at commitment tier",
      "Azure Hybrid Benefit included",
      "Dedicated account manager assigned",
      "Monthly overage billed at standard rates",
      "Data residency: Canada Central region"
    ]',
    'confirmed'
  ),

  -- Slack
  (
    'Slack',
    'slack-pro-2025.pdf',
    '2025-06-30', true, 30, 5400.00,
    '5% annual increase at renewal',
    'Slack Pro plan for the Engineering team. Covers unlimited message history, group calls, and integrations with GitHub and Jira.',
    '[
      "Unlimited message history",
      "Unlimited integrations (GitHub, Jira, PagerDuty)",
      "Group video and audio calls",
      "99.99% guaranteed uptime SLA",
      "Data export for all messages",
      "SAML-based SSO via Okta"
    ]',
    'confirmed'
  ),

  -- Zoom
  (
    'Zoom',
    'zoom-business-2025.pdf',
    '2025-08-31', false, 30, 3600.00,
    'Fixed price; renegotiate at renewal',
    'Zoom Business plan for company-wide video conferencing. Covers up to 300 participants per meeting with cloud recording and webinar add-on for up to 10 hosts.',
    '[
      "Up to 300 participants per meeting",
      "Cloud recording with 1 TB storage",
      "Webinar add-on for 10 hosts",
      "SSO and managed domains",
      "Admin dashboard and usage reporting",
      "Phone dial-in numbers in 90+ countries"
    ]',
    'confirmed'
  ),

  -- HubSpot
  (
    'HubSpot',
    'hubspot-marketing-hub-2025.pdf',
    '2026-01-31', true, 60, 12000.00,
    '4% annual escalation; seats priced separately',
    'HubSpot Marketing Hub Professional for inbound marketing automation, email campaigns, landing pages, and CRM integration. Includes 5 core seats.',
    '[
      "5 Marketing Hub Professional seats",
      "10,000 marketing contacts included",
      "Email automation and A/B testing",
      "Landing page and blog tools",
      "CRM integration with Salesforce",
      "Phone support and onboarding included"
    ]',
    'confirmed'
  ),

  -- AWS
  (
    'AWS',
    'aws-enterprise-support-2025.pdf',
    '2025-11-30', true, 30, 31000.00,
    'Usage-based; $31,000 reserved instance commitment',
    'AWS Enterprise Support agreement with reserved EC2 and RDS instances for the Engineering and Data teams. Includes a Technical Account Manager and 24/7 business-critical support.',
    '[
      "$31,000 reserved instance commitment (1-year term)",
      "Technical Account Manager (TAM) assigned",
      "24/7 phone, chat, and email support",
      "Infrastructure Event Management included",
      "Well-Architected Review annual session",
      "Concierge support team access"
    ]',
    'confirmed'
  ),

  -- DocuSign
  (
    'DocuSign',
    'docusign-business-pro-2025.pdf',
    '2025-07-31', false, 30, 2800.00,
    'Fixed annual fee; volume overage at $0.15/envelope',
    'DocuSign Business Pro plan for the Legal team. Includes 2,500 envelopes per year, advanced recipient options, and Salesforce connector.',
    '[
      "2,500 envelopes per year included",
      "Advanced recipient field types",
      "Salesforce connector integration",
      "Bulk send for up to 500 recipients",
      "Signer attachments and ID verification",
      "$0.15 per envelope overage fee"
    ]',
    'pending_review'
  ),

  -- GitHub
  (
    'GitHub',
    'github-enterprise-2025.pdf',
    '2025-10-31', true, 30, 4800.00,
    '0% increase locked for 2 years',
    'GitHub Enterprise for source code hosting, CI/CD pipelines via GitHub Actions, and security scanning. Covers all Engineering team members.',
    '[
      "Unlimited private repositories",
      "GitHub Actions: 50,000 minutes/month included",
      "GitHub Advanced Security (code scanning, secret scanning)",
      "SAML SSO and team synchronization",
      "Audit log and compliance reporting",
      "99.95% uptime SLA"
    ]',
    'confirmed'
  ),

  -- Jira
  (
    'Jira',
    'jira-software-cloud-2025.pdf',
    '2025-05-31', true, 30, 3200.00,
    '5% annual increase per Atlassian standard terms',
    'Jira Software Cloud Standard for issue tracking and sprint planning. Covers the Engineering team with 35 user licenses.',
    '[
      "35 user licenses for Jira Software Cloud Standard",
      "Unlimited projects and boards",
      "Automation: 1,000 rule runs/month per user",
      "2 GB file storage per user",
      "Audit log (90-day retention)",
      "Standard support (9×5)"
    ]',
    'confirmed'
  ),

  -- Atlassian
  (
    'Atlassian',
    'atlassian-confluence-2025.pdf',
    '2025-05-31', true, 30, 1500.00,
    '5% annual increase per Atlassian standard terms',
    'Atlassian Confluence Cloud Standard for team documentation and knowledge base. Covers Operations team with 20 user licenses.',
    '[
      "20 user licenses for Confluence Cloud Standard",
      "Unlimited spaces and pages",
      "Jira integration for linked requirements",
      "Analytics and page insights",
      "250 GB file storage",
      "Standard support (9×5)"
    ]',
    'confirmed'
  ),

  -- Notion
  (
    'Notion',
    'notion-business-2025.pdf',
    '2026-02-28', true, 14, 1800.00,
    'Per-seat pricing; seats added mid-cycle prorated',
    'Notion Business plan for team wikis, project docs, and roadmaps. Covers the Operations team with 15 members.',
    '[
      "15 Business seats",
      "Unlimited blocks and file uploads",
      "Advanced permissions and page analytics",
      "SAML SSO included",
      "90-day version history",
      "Priority customer support"
    ]',
    'confirmed'
  ),

  -- Figma
  (
    'Figma',
    'figma-organization-2025.pdf',
    '2025-11-30', false, 30, 2400.00,
    'Fixed; renegotiate at renewal for additional seats',
    'Figma Organization plan for the Design team covering UI/UX design, prototyping, and developer handoff. Includes 5 full seats and unlimited viewer-only seats.',
    '[
      "5 full Design seats",
      "Unlimited viewer-only seats",
      "Org-wide libraries and design systems",
      "Branch and merge controls",
      "SAML SSO and advanced admin controls",
      "Private plugins support"
    ]',
    'confirmed'
  ),

  -- Adobe Creative Cloud
  (
    'Adobe Creative Cloud',
    'adobe-creative-cloud-team-2025.pdf',
    '2025-08-31', true, 30, 5600.00,
    '3% annual increase; VIP pricing tier maintained',
    'Adobe Creative Cloud for Teams covering the Marketing team. Includes all Creative Cloud apps (Photoshop, Illustrator, Premiere Pro, etc.) for 8 users.',
    '[
      "8 named user licenses (all Creative Cloud apps)",
      "100 GB cloud storage per user",
      "Adobe Fonts and Adobe Stock trial credits",
      "Tech support and 1:1 expert sessions",
      "Admin console for license management",
      "VIP licensing tier pricing applied"
    ]',
    'confirmed'
  ),

  -- Stripe
  (
    'Stripe',
    'stripe-payments-msa-2025.pdf',
    '2026-03-31', true, 60, 8200.00,
    'Transaction-based; 2.9% + $0.30 per transaction (negotiated rate)',
    'Stripe Payments Master Services Agreement for payment processing. Negotiated rate applies to all card-present and online transactions for the Finance team.',
    '[
      "Negotiated rate: 2.9% + $0.30 per successful transaction",
      "Interchange-plus pricing available at $50K+ monthly volume",
      "Stripe Radar fraud protection included",
      "PCI DSS Level 1 compliance maintained by Stripe",
      "Instant payouts at 1% fee",
      "Dedicated account manager"
    ]',
    'confirmed'
  ),

  -- Twilio
  (
    'Twilio',
    'twilio-messaging-api-2025.pdf',
    '2025-12-31', false, 30, 3400.00,
    'Usage-based; $3,400 committed spend for volume discount',
    'Twilio Messaging and Voice API for SMS notifications and automated calls managed by Engineering. Includes a committed spend discount.',
    '[
      "$3,400 annual committed spend",
      "SMS: $0.0075/message (US outbound) at committed tier",
      "Voice: $0.013/min outbound at committed tier",
      "10DLC campaign registration included",
      "99.95% API uptime SLA",
      "Dedicated support channel via Slack Connect"
    ]',
    'pending_review'
  ),

  -- Snowflake
  (
    'Snowflake',
    'snowflake-enterprise-2025.pdf',
    '2025-10-31', true, 60, 14500.00,
    'Capacity-based; $14,500 credit commitment with 10% rollover',
    'Snowflake Enterprise edition for the Data team. Includes cloud data warehousing, multi-cluster warehouses, and Time Travel up to 90 days.',
    '[
      "$14,500 Snowflake credit commitment (annual)",
      "10% unused credit rollover to next year",
      "Multi-cluster virtual warehouses",
      "90-day Time Travel and Fail-safe",
      "Data sharing across Snowflake accounts",
      "Tri-Secret Secure encryption supported"
    ]',
    'confirmed'
  ),

  -- Datadog
  (
    'Datadog',
    'datadog-pro-2025.pdf',
    '2025-09-30', true, 60, 6800.00,
    '5% annual increase; host-count pricing reviewed at renewal',
    'Datadog Pro plan for infrastructure monitoring, APM, and log management. Covers all Engineering hosts and 30-day log retention.',
    '[
      "Infrastructure monitoring: up to 50 hosts",
      "APM and distributed tracing included",
      "Log Management: 30-day retention, 100 GB/day",
      "Synthetic monitoring: 10,000 test runs/month",
      "Dashboards, alerts, and SLO tracking",
      "Dedicated Customer Success Manager"
    ]',
    'confirmed'
  ),

  -- PagerDuty
  (
    'PagerDuty',
    'pagerduty-business-2025.pdf',
    '2025-07-31', true, 30, 2200.00,
    'Per-user pricing; $2,200 locked for 2 years',
    'PagerDuty Business plan for on-call incident management and alerting. Covers all Engineering on-call engineers with Datadog and GitHub integrations.',
    '[
      "20 full user licenses",
      "Unlimited schedules and escalation policies",
      "Datadog, GitHub, and Slack integrations",
      "Advanced analytics and postmortem tools",
      "SSO via Okta",
      "24/7 support with 1-hour response SLA"
    ]',
    'confirmed'
  ),

  -- Okta
  (
    'Okta',
    'okta-workforce-identity-2025.pdf',
    '2026-01-31', true, 60, 7500.00,
    '4% annual increase; MFA add-on priced per user',
    'Okta Workforce Identity for SSO and MFA across all company applications. Manages all employee identities for the IT department.',
    '[
      "Single Sign-On for up to 200 users",
      "Adaptive MFA included",
      "Universal Directory with HR sync (Rippling)",
      "Lifecycle Management: automated provisioning",
      "API Access Management",
      "99.99% uptime SLA"
    ]',
    'confirmed'
  ),

  -- 1Password
  (
    '1Password',
    '1password-teams-2025.pdf',
    '2026-02-28', true, 14, 1600.00,
    'Per-seat pricing; billed annually',
    '1Password Teams for company-wide password and secrets management. Covers all IT-managed employees with admin controls and audit logs.',
    '[
      "Unlimited password storage for all users",
      "Admin console with role-based access",
      "Travel Mode for secure border crossings",
      "Advanced audit log (1-year retention)",
      "1Password Secrets Automation integration",
      "24/7 email and live chat support"
    ]',
    'confirmed'
  ),

  -- Intercom
  (
    'Intercom',
    'intercom-support-2025.pdf',
    '2025-06-30', false, 30, 4200.00,
    'Seat + resolution-based pricing; $4,200 base commitment',
    'Intercom Support plan for the Support team. Includes live chat, in-app messaging, a shared inbox, and chatbot automation for tier-1 deflection.',
    '[
      "5 Support seat licenses",
      "Live chat and in-app messaging",
      "AI chatbot (Fin) for tier-1 deflection",
      "Shared team inbox with SLA tracking",
      "Help Center with article suggestions",
      "Salesforce and Stripe integrations"
    ]',
    'pending_review'
  ),

  -- Zendesk
  (
    'Zendesk',
    'zendesk-suite-2025.pdf',
    '2025-08-31', true, 60, 3800.00,
    '5% annual increase; agent count reviewed at renewal',
    'Zendesk Suite Professional for ticketing, email, and chat support. Covers the Support team with reporting dashboards and SLA management.',
    '[
      "10 Support agent licenses",
      "Email, chat, and social media channels",
      "Custom SLA policies and CSAT surveys",
      "Advanced analytics and dashboards",
      "Sandbox environment for testing",
      "SAML SSO via Okta"
    ]',
    'confirmed'
  ),

  -- Greenhouse
  (
    'Greenhouse',
    'greenhouse-ats-2025.pdf',
    '2025-11-30', false, 45, 5500.00,
    'Fixed annual fee; priced per employee headcount band',
    'Greenhouse Applicant Tracking System for the HR team. Manages full recruitment lifecycle from job posting to offer letter for the company.',
    '[
      "Unlimited job postings and candidates",
      "Structured interview kits and scorecards",
      "LinkedIn and Indeed integrations",
      "Rippling HRIS integration for onboarding",
      "Offer management and e-signature",
      "EEOC/OFCCP compliance reporting"
    ]',
    'confirmed'
  ),

  -- Rippling
  (
    'Rippling',
    'rippling-hr-payroll-2025.pdf',
    '2026-03-31', true, 60, 9200.00,
    'Per-employee per-month pricing; $9,200 annual at current headcount',
    'Rippling HR and Payroll platform for the HR team. Manages employee onboarding, payroll processing, benefits administration, and device management.',
    '[
      "Payroll processing for all employees (Canada & US)",
      "Benefits administration and open enrollment",
      "Device management (MDM) for company hardware",
      "Automated onboarding/offboarding workflows",
      "Okta and Greenhouse integrations",
      "HR compliance and reporting tools"
    ]',
    'confirmed'
  )

) as c(
  vendor_name, file_name, renewal_date, auto_renew, notice_period_days,
  contract_value, pricing_escalation, summary, key_terms, status
)
on v.name = c.vendor_name
where v.name is not null;
