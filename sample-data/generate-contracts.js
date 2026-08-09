// Run from the vendorlens directory:
//   node sample-data/generate-contracts.js
//
// Requires: pdfkit (npm install --save-dev pdfkit)

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname);
const CUSTOMER = {
  name: 'Acme Corporation',
  address: '1600 Technology Drive, Halifax, NS B3J 1N9',
  cfo: 'Marcus Reid',
  title: 'Chief Financial Officer',
};

const vendors = [
  {
    id: 'SF-ENT-2025-00201',
    name: 'Salesforce',
    legalName: 'Salesforce, Inc.',
    address: '415 Mission Street, San Francisco, CA 94105',
    website: 'salesforce.com',
    contactEmail: 'contracts@salesforce.com',
    department: 'Sales',
    category: 'CRM',
    contractType: 'Master Software Subscription Agreement',
    description: 'Enterprise CRM Platform License & Support Services',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'September 30, 2025',
    term: '9 months (January 1, 2025 – September 30, 2025)',
    autoRenew: true,
    noticeDays: 60,
    annualValue: 24500,
    escalation: '3% annual increase applied at each renewal',
    services: [
      'Sales Cloud Enterprise — 50 named user licenses',
      'Premier Success Plan — included',
      'Unlimited API calls',
      'Mobile access and offline sync',
    ],
    sla: ['99.9% monthly uptime for Sales Cloud platform', 'P1 incidents: 1-hour response, 4-hour resolution', 'P2 incidents: 4-hour response, 8-hour resolution', 'SLA credit: 10% monthly fee per 0.1% below 99.9%'],
    signerVendor: { name: 'Jennifer Zhao', title: 'VP, Enterprise Sales' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'Province of Ontario, Canada',
  },
  {
    id: 'MSFT-AZ-2025-00188',
    name: 'Microsoft Azure',
    legalName: 'Microsoft Corporation',
    address: 'One Microsoft Way, Redmond, WA 98052',
    website: 'azure.microsoft.com',
    contactEmail: 'contracts@microsoft.com',
    department: 'Engineering',
    category: 'Cloud Infrastructure',
    contractType: 'Enterprise Agreement — Cloud Services',
    description: 'Azure Cloud Compute, Storage & Networking Services',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'December 31, 2025',
    term: '12 months (January 1, 2025 – December 31, 2025)',
    autoRenew: true,
    noticeDays: 30,
    annualValue: 18750,
    escalation: 'Usage-based; committed spend tier unlocks 15% discount',
    services: [
      '$18,750 annual committed spend commitment',
      'Azure Virtual Machines (compute)',
      'Azure Blob Storage and CDN',
      'Azure Hybrid Benefit included',
      'Dedicated Account Manager',
    ],
    sla: ['99.95% uptime for Azure compute and storage', 'P1: 15-min response via 24/7 phone support', 'Planned maintenance notified 7 days in advance', 'Credits issued for downtime below SLA thresholds'],
    signerVendor: { name: 'Daniel Park', title: 'Director, Enterprise Sales' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'Province of Ontario, Canada',
  },
  {
    id: 'SLACK-2025-00374',
    name: 'Slack',
    legalName: 'Slack Technologies, LLC (a Salesforce Company)',
    address: '500 Howard Street, San Francisco, CA 94105',
    website: 'slack.com',
    contactEmail: 'billing@slack.com',
    department: 'Engineering',
    category: 'Communication',
    contractType: 'SaaS Subscription Agreement',
    description: 'Team Messaging & Collaboration Platform',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'June 30, 2025',
    term: '6 months (January 1, 2025 – June 30, 2025)',
    autoRenew: true,
    noticeDays: 30,
    annualValue: 5400,
    escalation: '5% annual increase at renewal',
    services: [
      'Slack Pro — unlimited message history',
      'Unlimited integrations (GitHub, Jira, PagerDuty)',
      'Group video and audio calls',
      'SAML-based SSO via Okta',
      'Data export for all messages',
    ],
    sla: ['99.99% uptime SLA', 'P1: 1-hour response, 4-hour resolution', 'Status page at status.slack.com', 'SLA credit issued for downtime below guarantee'],
    signerVendor: { name: 'Rachel Kim', title: 'Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
  {
    id: 'ZOOM-2025-00512',
    name: 'Zoom',
    legalName: 'Zoom Video Communications, Inc.',
    address: '55 Almaden Blvd, Suite 600, San Jose, CA 95113',
    website: 'zoom.us',
    contactEmail: 'billing@zoom.us',
    department: 'Operations',
    category: 'Communication',
    contractType: 'Business Plan Subscription Agreement',
    description: 'Video Conferencing & Webinar Services',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'August 31, 2025',
    term: '8 months (January 1, 2025 – August 31, 2025)',
    autoRenew: false,
    noticeDays: 30,
    annualValue: 3600,
    escalation: 'Fixed price; renegotiate at renewal',
    services: [
      'Zoom Business — up to 300 participants per meeting',
      'Cloud recording with 1 TB storage',
      'Webinar add-on for 10 hosts',
      'SSO and managed domains',
      'Admin dashboard and usage reporting',
      'Phone dial-in numbers in 90+ countries',
    ],
    sla: ['99.9% service availability', 'P1: 2-hour response, 8-hour resolution', 'Scheduled maintenance during off-peak hours', 'Service credits for availability failures'],
    signerVendor: { name: 'Alex Chen', title: 'Senior Account Manager' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
  {
    id: 'HSPT-2025-00093',
    name: 'HubSpot',
    legalName: 'HubSpot, Inc.',
    address: '25 First Street, 2nd Floor, Cambridge, MA 02141',
    website: 'hubspot.com',
    contactEmail: 'billing@hubspot.com',
    department: 'Marketing',
    category: 'Marketing Automation',
    contractType: 'SaaS Subscription Agreement',
    description: 'Inbound Marketing & CRM Platform',
    effectiveDate: 'February 01, 2025',
    renewalDate: 'January 31, 2026',
    term: '12 months (February 1, 2025 – January 31, 2026)',
    autoRenew: true,
    noticeDays: 60,
    annualValue: 12000,
    escalation: '4% annual escalation; additional seats priced separately',
    services: [
      'Marketing Hub Professional — 5 core seats',
      '10,000 marketing contacts included',
      'Email automation and A/B testing',
      'Landing page and blog tools',
      'CRM integration with Salesforce',
      'Onboarding and phone support included',
    ],
    sla: ['99.99% uptime for Marketing Hub', 'P1: 1-hour response via 24/7 support', 'Dedicated Customer Success Manager', 'Monthly performance reviews included'],
    signerVendor: { name: 'Sofia Patel', title: 'Enterprise Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of Massachusetts, USA',
  },
  {
    id: 'AWS-2025-00047',
    name: 'AWS',
    legalName: 'Amazon Web Services, Inc.',
    address: '410 Terry Avenue North, Seattle, WA 98109',
    website: 'aws.amazon.com',
    contactEmail: 'aws-ar@amazon.com',
    department: 'Engineering',
    category: 'Cloud Infrastructure',
    contractType: 'Enterprise Support & Reserved Instance Agreement',
    description: 'Cloud Compute, Storage & Enterprise Support Services',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'November 30, 2025',
    term: '11 months (January 1, 2025 – November 30, 2025)',
    autoRenew: true,
    noticeDays: 30,
    annualValue: 31000,
    escalation: 'Usage-based; $31,000 reserved instance commitment',
    services: [
      '$31,000 reserved EC2 and RDS instance commitment (1-year)',
      'AWS Enterprise Support included',
      'Technical Account Manager (TAM) assigned',
      'Well-Architected Review — annual session',
      'Concierge support team access',
    ],
    sla: ['99.99% uptime for EC2 and S3', '24/7 phone, chat, and email support', 'P1: 15-min response time', 'Infrastructure Event Management included'],
    signerVendor: { name: 'Michael Torres', title: 'Enterprise Account Manager' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of Washington, USA',
  },
  {
    id: 'DOCU-2025-00289',
    name: 'DocuSign',
    legalName: 'DocuSign, Inc.',
    address: '221 Main Street, Suite 1000, San Francisco, CA 94105',
    website: 'docusign.com',
    contactEmail: 'billing@docusign.com',
    department: 'Legal',
    category: 'Document Management',
    contractType: 'SaaS Subscription Agreement',
    description: 'Electronic Signature & Agreement Cloud Platform',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'July 31, 2025',
    term: '7 months (January 1, 2025 – July 31, 2025)',
    autoRenew: false,
    noticeDays: 30,
    annualValue: 2800,
    escalation: 'Fixed annual fee; $0.15/envelope overage',
    services: [
      'DocuSign Business Pro — 2,500 envelopes/year',
      'Advanced recipient field types',
      'Salesforce connector integration',
      'Bulk send for up to 500 recipients',
      'Signer attachments and ID verification',
    ],
    sla: ['99.9% uptime for eSignature platform', 'P1: 2-hour response, 4-hour resolution', 'Audit trail for all signed documents', 'SOC 2 Type II and ISO 27001 certified'],
    signerVendor: { name: 'Priya Sharma', title: 'Commercial Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
  {
    id: 'GH-2025-00156',
    name: 'GitHub',
    legalName: 'GitHub, Inc. (a Microsoft Company)',
    address: '88 Colin P Kelly Jr Street, San Francisco, CA 94107',
    website: 'github.com',
    contactEmail: 'enterprise@github.com',
    department: 'Engineering',
    category: 'Developer Tools',
    contractType: 'Enterprise Subscription Agreement',
    description: 'Source Code Hosting, CI/CD & Security Scanning',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'October 31, 2025',
    term: '10 months (January 1, 2025 – October 31, 2025)',
    autoRenew: true,
    noticeDays: 30,
    annualValue: 4800,
    escalation: '0% increase locked for 2 years',
    services: [
      'GitHub Enterprise — unlimited private repositories',
      'GitHub Actions: 50,000 minutes/month included',
      'GitHub Advanced Security (code scanning, secret scanning)',
      'SAML SSO and team synchronization',
      'Audit log and compliance reporting',
    ],
    sla: ['99.95% uptime SLA', 'P1: 30-min response via 24/7 support', 'Status page at githubstatus.com', 'Credits applied for downtime below SLA'],
    signerVendor: { name: 'James Liu', title: 'Enterprise Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
  {
    id: 'JIRA-2025-00421',
    name: 'Jira',
    legalName: 'Atlassian Corporation Plc',
    address: '350 Bush Street, Floor 13, San Francisco, CA 94104',
    website: 'atlassian.com/software/jira',
    contactEmail: 'billing@atlassian.com',
    department: 'Engineering',
    category: 'Project Management',
    contractType: 'Cloud Subscription Agreement',
    description: 'Issue Tracking & Sprint Planning Platform',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'May 31, 2025',
    term: '5 months (January 1, 2025 – May 31, 2025)',
    autoRenew: true,
    noticeDays: 30,
    annualValue: 3200,
    escalation: '5% annual increase per Atlassian standard terms',
    services: [
      'Jira Software Cloud Standard — 35 user licenses',
      'Unlimited projects and boards',
      'Automation: 1,000 rule runs/month per user',
      '2 GB file storage per user',
      'Audit log (90-day retention)',
    ],
    sla: ['99.9% uptime for Jira Cloud', 'Standard support (9×5)', 'P1: 2-hour response during business hours', 'Status page at status.atlassian.com'],
    signerVendor: { name: 'Sarah Thompson', title: 'Account Manager, SMB' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of New York, USA',
  },
  {
    id: 'CONF-2025-00422',
    name: 'Atlassian',
    legalName: 'Atlassian Corporation Plc',
    address: '350 Bush Street, Floor 13, San Francisco, CA 94104',
    website: 'atlassian.com/software/confluence',
    contactEmail: 'billing@atlassian.com',
    department: 'Operations',
    category: 'Project Management',
    contractType: 'Cloud Subscription Agreement',
    description: 'Confluence Wiki & Team Documentation Platform',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'May 31, 2025',
    term: '5 months (January 1, 2025 – May 31, 2025)',
    autoRenew: true,
    noticeDays: 30,
    annualValue: 1500,
    escalation: '5% annual increase per Atlassian standard terms',
    services: [
      'Confluence Cloud Standard — 20 user licenses',
      'Unlimited spaces and pages',
      'Jira integration for linked requirements',
      'Analytics and page insights',
      '250 GB shared file storage',
    ],
    sla: ['99.9% uptime for Confluence Cloud', 'Standard support (9×5)', 'P1: 2-hour response during business hours', 'Status page at status.atlassian.com'],
    signerVendor: { name: 'Sarah Thompson', title: 'Account Manager, SMB' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of New York, USA',
  },
  {
    id: 'NTION-2025-00310',
    name: 'Notion',
    legalName: 'Notion Labs, Inc.',
    address: '2300 Harrison Street, San Francisco, CA 94110',
    website: 'notion.so',
    contactEmail: 'billing@notion.so',
    department: 'Operations',
    category: 'Productivity',
    contractType: 'SaaS Subscription Agreement',
    description: 'Team Wiki, Docs & Project Planning Platform',
    effectiveDate: 'March 01, 2025',
    renewalDate: 'February 28, 2026',
    term: '12 months (March 1, 2025 – February 28, 2026)',
    autoRenew: true,
    noticeDays: 14,
    annualValue: 1800,
    escalation: 'Per-seat pricing; mid-cycle additions prorated',
    services: [
      'Notion Business — 15 seats',
      'Unlimited blocks and file uploads',
      'Advanced permissions and page analytics',
      'SAML SSO included',
      '90-day version history',
    ],
    sla: ['99.9% uptime', 'Priority email support', 'P1: 4-hour response', 'Status page at notion.so/status'],
    signerVendor: { name: 'Lena Nguyen', title: 'Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
  {
    id: 'FGMA-2025-00278',
    name: 'Figma',
    legalName: 'Figma, Inc.',
    address: '760 Market Street, Floor 10, San Francisco, CA 94102',
    website: 'figma.com',
    contactEmail: 'billing@figma.com',
    department: 'Design',
    category: 'Design Tools',
    contractType: 'Organization Plan Subscription Agreement',
    description: 'UI/UX Design, Prototyping & Dev Handoff Platform',
    effectiveDate: 'February 01, 2025',
    renewalDate: 'November 30, 2025',
    term: '10 months (February 1, 2025 – November 30, 2025)',
    autoRenew: false,
    noticeDays: 30,
    annualValue: 2400,
    escalation: 'Fixed; renegotiate at renewal for additional seats',
    services: [
      'Figma Organization — 5 full editor seats',
      'Unlimited viewer-only seats',
      'Org-wide libraries and design systems',
      'Branch and merge version controls',
      'SAML SSO and advanced admin controls',
      'Private plugins support',
    ],
    sla: ['99.9% service availability', 'Priority support for Organization plans', 'P1: 2-hour response', 'Status page at status.figma.com'],
    signerVendor: { name: 'Mia Robinson', title: 'Sales Manager' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
  {
    id: 'ADBE-2025-00099',
    name: 'Adobe Creative Cloud',
    legalName: 'Adobe Inc.',
    address: '345 Park Avenue, San Jose, CA 95110',
    website: 'adobe.com',
    contactEmail: 'enterprise@adobe.com',
    department: 'Marketing',
    category: 'Design Tools',
    contractType: 'VIP Licensing Agreement — Creative Cloud for Teams',
    description: 'Creative Suite Licensing for Marketing Team',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'August 31, 2025',
    term: '8 months (January 1, 2025 – August 31, 2025)',
    autoRenew: true,
    noticeDays: 30,
    annualValue: 5600,
    escalation: '3% annual increase; VIP pricing tier maintained',
    services: [
      'Creative Cloud for Teams — 8 named user licenses (all apps)',
      'Photoshop, Illustrator, Premiere Pro, After Effects',
      '100 GB cloud storage per user',
      'Adobe Fonts and Stock trial credits',
      'Admin console for license management',
    ],
    sla: ['99.9% service availability for Creative Cloud apps', 'Enterprise support: 24/7 phone and chat', 'P1: 1-hour response, 4-hour resolution', 'Dedicated Technical Account Manager'],
    signerVendor: { name: 'Carlos Mendes', title: 'Enterprise Account Director' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
  {
    id: 'STRP-2025-00334',
    name: 'Stripe',
    legalName: 'Stripe, Inc.',
    address: '354 Oyster Point Blvd, South San Francisco, CA 94080',
    website: 'stripe.com',
    contactEmail: 'support@stripe.com',
    department: 'Finance',
    category: 'Payments',
    contractType: 'Master Services Agreement — Payment Processing',
    description: 'Payment Processing & Revenue Optimisation Platform',
    effectiveDate: 'April 01, 2025',
    renewalDate: 'March 31, 2026',
    term: '12 months (April 1, 2025 – March 31, 2026)',
    autoRenew: true,
    noticeDays: 60,
    annualValue: 8200,
    escalation: 'Transaction-based; 2.9% + $0.30 per card transaction (negotiated)',
    services: [
      'Stripe Payments — negotiated rate: 2.9% + $0.30/transaction',
      'Stripe Radar fraud protection included',
      'Stripe Billing for subscription management',
      'Instant payouts at 1% fee',
      'PCI DSS Level 1 compliance by Stripe',
      'Dedicated account manager',
    ],
    sla: ['99.999% API uptime', '24/7 on-call support', 'P1: 15-min response via dedicated Slack channel', 'Quarterly business reviews with account team'],
    signerVendor: { name: 'Natalie Brooks', title: 'Strategic Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
  {
    id: 'TWLO-2025-00201',
    name: 'Twilio',
    legalName: 'Twilio Inc.',
    address: '375 Beale Street, Suite 300, San Francisco, CA 94105',
    website: 'twilio.com',
    contactEmail: 'billing@twilio.com',
    department: 'Engineering',
    category: 'Communications API',
    contractType: 'Committed Use Agreement — Messaging & Voice API',
    description: 'SMS, MMS & Voice API Services',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'December 31, 2025',
    term: '12 months (January 1, 2025 – December 31, 2025)',
    autoRenew: false,
    noticeDays: 30,
    annualValue: 3400,
    escalation: 'Usage-based; $3,400 committed spend for volume discount',
    services: [
      '$3,400 annual committed spend commitment',
      'SMS outbound: $0.0075/message (US) at committed tier',
      'Voice outbound: $0.013/minute at committed tier',
      '10DLC campaign registration included',
      'Dedicated support channel via Slack Connect',
    ],
    sla: ['99.95% API uptime', '24/7 developer support', 'P1: 30-min response time', 'Status page at status.twilio.com'],
    signerVendor: { name: 'David Okafor', title: 'Senior Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of Delaware, USA',
  },
  {
    id: 'SNOW-2025-00067',
    name: 'Snowflake',
    legalName: 'Snowflake Inc.',
    address: '450 Concar Drive, San Mateo, CA 94402',
    website: 'snowflake.com',
    contactEmail: 'contracts@snowflake.com',
    department: 'Data',
    category: 'Data Warehouse',
    contractType: 'Enterprise Capacity Agreement',
    description: 'Cloud Data Warehousing & Analytics Platform',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'October 31, 2025',
    term: '10 months (January 1, 2025 – October 31, 2025)',
    autoRenew: true,
    noticeDays: 60,
    annualValue: 14500,
    escalation: 'Capacity-based; $14,500 credit commitment with 10% rollover',
    services: [
      'Snowflake Enterprise Edition — $14,500 credit commitment',
      '10% unused credit rollover to next year',
      'Multi-cluster virtual warehouses',
      '90-day Time Travel and Fail-safe',
      'Cross-account data sharing',
      'Tri-Secret Secure encryption supported',
    ],
    sla: ['99.9% service availability', 'Enterprise support: 24/7 Severity 1 response', 'P1: 1-hour response, 4-hour resolution', 'Dedicated Technical Account Manager'],
    signerVendor: { name: 'Hannah Lee', title: 'Enterprise Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
  {
    id: 'DDOG-2025-00142',
    name: 'Datadog',
    legalName: 'Datadog, Inc.',
    address: '620 8th Avenue, 45th Floor, New York, NY 10018',
    website: 'datadoghq.com',
    contactEmail: 'billing@datadoghq.com',
    department: 'Engineering',
    category: 'Monitoring',
    contractType: 'Pro Plan Subscription Agreement',
    description: 'Infrastructure Monitoring, APM & Log Management',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'September 30, 2025',
    term: '9 months (January 1, 2025 – September 30, 2025)',
    autoRenew: true,
    noticeDays: 60,
    annualValue: 6800,
    escalation: '5% annual increase; host-count reviewed at renewal',
    services: [
      'Infrastructure Monitoring — up to 50 hosts',
      'APM and distributed tracing included',
      'Log Management: 30-day retention, 100 GB/day',
      'Synthetic monitoring: 10,000 test runs/month',
      'Dashboards, alerts, and SLO tracking',
      'Dedicated Customer Success Manager',
    ],
    sla: ['99.9% platform availability', '24/7 enterprise support', 'P1: 1-hour response, 4-hour resolution', 'Status page at status.datadoghq.com'],
    signerVendor: { name: 'Chris Patel', title: 'Enterprise Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of New York, USA',
  },
  {
    id: 'PDY-2025-00233',
    name: 'PagerDuty',
    legalName: 'PagerDuty, Inc.',
    address: '600 Townsend Street, Suite 125, San Francisco, CA 94103',
    website: 'pagerduty.com',
    contactEmail: 'billing@pagerduty.com',
    department: 'Engineering',
    category: 'Monitoring',
    contractType: 'Business Plan Subscription Agreement',
    description: 'On-Call Incident Management & Alerting Platform',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'July 31, 2025',
    term: '7 months (January 1, 2025 – July 31, 2025)',
    autoRenew: true,
    noticeDays: 30,
    annualValue: 2200,
    escalation: 'Per-user pricing; $2,200 locked for 2 years',
    services: [
      'PagerDuty Business — 20 full user licenses',
      'Unlimited schedules and escalation policies',
      'Datadog, GitHub, and Slack integrations',
      'Advanced analytics and postmortem tools',
      'SSO via Okta',
    ],
    sla: ['99.9% uptime', '24/7 support with 1-hour response for Severity 1', 'P1: 1-hour response, 2-hour resolution', 'Status page at status.pagerduty.com'],
    signerVendor: { name: 'Tom Walsh', title: 'Account Manager' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
  {
    id: 'OKTA-2025-00088',
    name: 'Okta',
    legalName: 'Okta, Inc.',
    address: '100 First Street, Suite 600, San Francisco, CA 94105',
    website: 'okta.com',
    contactEmail: 'contracts@okta.com',
    department: 'IT',
    category: 'Identity Management',
    contractType: 'Workforce Identity Cloud Agreement',
    description: 'Single Sign-On & Identity Provider Platform',
    effectiveDate: 'February 01, 2025',
    renewalDate: 'January 31, 2026',
    term: '12 months (February 1, 2025 – January 31, 2026)',
    autoRenew: true,
    noticeDays: 60,
    annualValue: 7500,
    escalation: '4% annual increase; MFA add-on priced per user',
    services: [
      'Okta SSO — up to 200 users',
      'Adaptive Multi-Factor Authentication (MFA)',
      'Universal Directory with HR sync (Rippling)',
      'Lifecycle Management: automated provisioning',
      'API Access Management',
    ],
    sla: ['99.99% uptime SLA', '24/7 Premier Support', 'P1: 30-min response, 2-hour resolution', 'Status page at status.okta.com'],
    signerVendor: { name: 'Julia Adams', title: 'Enterprise Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
  {
    id: '1PWD-2025-00445',
    name: '1Password',
    legalName: '1Password (AgileBits Inc.)',
    address: '4711 Yonge Street, Suite 1600, Toronto, ON M2N 6K8',
    website: '1password.com',
    contactEmail: 'billing@1password.com',
    department: 'IT',
    category: 'Security',
    contractType: 'Teams Plan Subscription Agreement',
    description: 'Enterprise Password & Secrets Management',
    effectiveDate: 'March 01, 2025',
    renewalDate: 'February 28, 2026',
    term: '12 months (March 1, 2025 – February 28, 2026)',
    autoRenew: true,
    noticeDays: 14,
    annualValue: 1600,
    escalation: 'Per-seat pricing; billed annually',
    services: [
      '1Password Teams — all employees',
      'Unlimited password storage',
      'Admin console with role-based access',
      'Advanced audit log (1-year retention)',
      '1Password Secrets Automation integration',
      'Travel Mode for secure border crossings',
    ],
    sla: ['99.9% service availability', '24/7 email and live chat support', 'P1: 2-hour response, 8-hour resolution', 'Status page at status.1password.com'],
    signerVendor: { name: 'Emma Clarke', title: 'Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'Province of Ontario, Canada',
  },
  {
    id: 'INTR-2025-00366',
    name: 'Intercom',
    legalName: 'Intercom, Inc.',
    address: '55 2nd Street, 4th Floor, San Francisco, CA 94105',
    website: 'intercom.com',
    contactEmail: 'billing@intercom.com',
    department: 'Support',
    category: 'Customer Support',
    contractType: 'Support Plan Subscription Agreement',
    description: 'Customer Messaging & Live Chat Support Platform',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'June 30, 2025',
    term: '6 months (January 1, 2025 – June 30, 2025)',
    autoRenew: false,
    noticeDays: 30,
    annualValue: 4200,
    escalation: 'Seat + resolution-based; $4,200 base commitment',
    services: [
      'Intercom Support — 5 seat licenses',
      'Live chat and in-app messaging',
      'AI chatbot (Fin) for tier-1 deflection',
      'Shared team inbox with SLA tracking',
      'Help Center with article suggestions',
      'Salesforce and Stripe integrations',
    ],
    sla: ['99.9% service availability', 'Priority support for business plans', 'P1: 2-hour response during business hours', 'Status page at status.intercom.com'],
    signerVendor: { name: 'Ryan Foster', title: 'Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
  {
    id: 'ZNDK-2025-00178',
    name: 'Zendesk',
    legalName: 'Zendesk, Inc.',
    address: '989 Market Street, San Francisco, CA 94103',
    website: 'zendesk.com',
    contactEmail: 'billing@zendesk.com',
    department: 'Support',
    category: 'Customer Support',
    contractType: 'Suite Professional Subscription Agreement',
    description: 'Help Desk Ticketing & Customer Support Platform',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'August 31, 2025',
    term: '8 months (January 1, 2025 – August 31, 2025)',
    autoRenew: true,
    noticeDays: 60,
    annualValue: 3800,
    escalation: '5% annual increase; agent count reviewed at renewal',
    services: [
      'Zendesk Suite Professional — 10 agent licenses',
      'Email, chat, and social media channels',
      'Custom SLA policies and CSAT surveys',
      'Advanced analytics and dashboards',
      'Sandbox environment for testing',
      'SAML SSO via Okta',
    ],
    sla: ['99.9% uptime SLA', 'Professional support (24/5 email)', 'P1: 1-hour response, 4-hour resolution', 'Status page at status.zendesk.com'],
    signerVendor: { name: 'Olivia Grant', title: 'Commercial Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
  {
    id: 'GH-ATS-2025-00090',
    name: 'Greenhouse',
    legalName: 'Greenhouse Software, Inc.',
    address: '110 5th Avenue, 3rd Floor, New York, NY 10011',
    website: 'greenhouse.io',
    contactEmail: 'billing@greenhouse.io',
    department: 'HR',
    category: 'HR Software',
    contractType: 'Applicant Tracking System Subscription Agreement',
    description: 'Recruitment & Applicant Tracking System',
    effectiveDate: 'January 01, 2025',
    renewalDate: 'November 30, 2025',
    term: '11 months (January 1, 2025 – November 30, 2025)',
    autoRenew: false,
    noticeDays: 45,
    annualValue: 5500,
    escalation: 'Fixed annual fee; priced per employee headcount band',
    services: [
      'Greenhouse ATS — unlimited job postings and candidates',
      'Structured interview kits and scorecards',
      'LinkedIn and Indeed integrations',
      'Rippling HRIS integration for onboarding',
      'Offer management and e-signature',
      'EEOC/OFCCP compliance reporting',
    ],
    sla: ['99.9% platform uptime', 'Standard support (M–F, 9 AM–6 PM ET)', 'P1: 2-hour response, 8-hour resolution', 'Dedicated Customer Success Manager'],
    signerVendor: { name: 'Amanda Torres', title: 'Mid-Market Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of New York, USA',
  },
  {
    id: 'RPLN-2025-00055',
    name: 'Rippling',
    legalName: 'Rippling People Center, Inc.',
    address: '55 2nd Street, 16th Floor, San Francisco, CA 94105',
    website: 'rippling.com',
    contactEmail: 'billing@rippling.com',
    department: 'HR',
    category: 'HR Software',
    contractType: 'HR & Payroll Platform Subscription Agreement',
    description: 'HR, Payroll, Benefits & Device Management Platform',
    effectiveDate: 'April 01, 2025',
    renewalDate: 'March 31, 2026',
    term: '12 months (April 1, 2025 – March 31, 2026)',
    autoRenew: true,
    noticeDays: 60,
    annualValue: 9200,
    escalation: 'Per-employee per-month pricing; $9,200 at current headcount',
    services: [
      'Payroll processing for all employees (Canada & US)',
      'Benefits administration and open enrollment',
      'Device Management (MDM) for company hardware',
      'Automated onboarding/offboarding workflows',
      'Okta and Greenhouse integrations',
      'HR compliance and reporting tools',
    ],
    sla: ['99.9% platform availability', '24/7 payroll emergency support', 'P1: 1-hour response for payroll issues', 'Dedicated HR Success Manager assigned'],
    signerVendor: { name: 'Ben Cooper', title: 'Enterprise Account Executive' },
    signerCustomer: { name: CUSTOMER.cfo, title: CUSTOMER.title },
    govLaw: 'State of California, USA',
  },
];

// ─── PDF helpers ────────────────────────────────────────────────────────────

function formatCurrency(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD';
}

function generateContract(vendor) {
  return new Promise((resolve, reject) => {
    const fileName = vendor.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-contract-2025.pdf';
    const filePath = path.join(OUT_DIR, fileName);
    const doc = new PDFDocument({ margin: 60, size: 'LETTER', bufferPages: true });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const PAGE_WIDTH = doc.page.width;
    const MARGIN = 60;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

    // ── Header ──────────────────────────────────────────────────────────────
    doc.fontSize(14).font('Helvetica-Bold').text(vendor.contractType.toUpperCase(), MARGIN, 60, { width: CONTENT_WIDTH, align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').text(vendor.description, { width: CONTENT_WIDTH, align: 'center' });
    doc.moveDown(1.2);

    // ── Agreement details table ──────────────────────────────────────────────
    const details = [
      ['Agreement Date:', vendor.effectiveDate],
      ['Contract ID:', vendor.id],
      ['Vendor:', `${vendor.legalName} | ${vendor.address}`],
      ['Customer:', `${CUSTOMER.name} | ${CUSTOMER.address}`],
      ['Effective Date:', vendor.effectiveDate],
      ['Renewal Date:', vendor.renewalDate],
      ['Contract Term:', vendor.term],
      ['Auto-Renewal:', vendor.autoRenew ? `Yes – ${vendor.noticeDays}-day written notice required to cancel` : `No – manual renewal required`],
      ['Notice Period:', `${vendor.noticeDays} days written notice required`],
      ['Contract Value:', `${formatCurrency(vendor.annualValue)} / year`],
      ['Pricing Escalation:', vendor.escalation],
    ];

    details.forEach(([label, value]) => {
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(9).text(label, MARGIN, y, { width: 140, continued: false });
      doc.font('Helvetica').fontSize(9).text(value, MARGIN + 145, y, { width: CONTENT_WIDTH - 145 });
    });

    doc.moveDown(1.2);

    // ── Section helper ────────────────────────────────────────────────────────
    function section(title, body) {
      if (doc.y > doc.page.height - 150) doc.addPage();
      doc.font('Helvetica-Bold').fontSize(11).text(title, MARGIN, doc.y);
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(9);
      if (typeof body === 'string') {
        doc.text(body, MARGIN, doc.y, { width: CONTENT_WIDTH });
      } else if (Array.isArray(body)) {
        body.forEach((item) => {
          doc.text(`• ${item}`, MARGIN + 10, doc.y, { width: CONTENT_WIDTH - 10 });
        });
      }
      doc.moveDown(0.8);
    }

    // ── 1. Scope of Services ─────────────────────────────────────────────────
    section(
      '1. Scope of Services',
      `${vendor.legalName} ("Vendor") agrees to provide ${CUSTOMER.name} ("Customer") with access to the following services and licensed products for the ${vendor.department} department under this Agreement:`
    );
    doc.font('Helvetica').fontSize(9);
    vendor.services.forEach((s) => {
      doc.text(`• ${s}`, MARGIN + 10, doc.y, { width: CONTENT_WIDTH - 10 });
    });
    doc.moveDown(0.8);

    // ── 2. Fees & Payment ────────────────────────────────────────────────────
    section(
      '2. Fees & Payment Terms',
      `The total annual contract value is ${formatCurrency(vendor.annualValue)}, invoiced annually in advance on the Effective Date of each contract year. Payment is due within 30 days of invoice date. Late payments accrue interest at 1.5% per month. All fees are exclusive of applicable taxes.\n\nPricing escalation terms: ${vendor.escalation}.`
    );

    // ── 3. Auto-Renewal ──────────────────────────────────────────────────────
    if (vendor.autoRenew) {
      section(
        '3. Auto-Renewal & Cancellation',
        `This Agreement will automatically renew for successive 12-month periods at the then-current pricing plus the applicable annual escalation rate, unless either party provides written notice of non-renewal at least ${vendor.noticeDays} days prior to the Renewal Date.\n\nCancellation notice must be submitted in writing to ${vendor.contactEmail} and acknowledged in writing by Vendor to be effective. Customer remains liable for fees through the end of the current term regardless of cancellation.`
      );
    } else {
      section(
        '3. Renewal & Cancellation',
        `This Agreement does NOT auto-renew. Customer must provide written notice of intent to renew at least ${vendor.noticeDays} days before the Renewal Date (${vendor.renewalDate}) to receive pricing continuity. Renewal is subject to Vendor availability and mutual agreement on pricing. If no renewal notice is received, this Agreement will expire at the end of the current term.`
      );
    }

    // ── 4. SLA ───────────────────────────────────────────────────────────────
    section('4. Service Level Agreement (SLA)', vendor.sla);

    // ── 5. Data Security ─────────────────────────────────────────────────────
    section(
      '5. Data Security & Privacy',
      `Vendor will maintain SOC 2 Type II and ISO 27001 certifications throughout the term. Customer data is encrypted in transit (TLS 1.2+) and at rest (AES-256). Vendor will notify Customer within 72 hours of any confirmed data breach affecting Customer data. Data handling complies with applicable Canadian privacy legislation (PIPEDA / provincial equivalents).`
    );

    // ── 6. Key Terms ─────────────────────────────────────────────────────────
    section('6. Key Terms & Conditions', [
      'Intellectual Property: All Vendor software, documentation, and derivatives remain the exclusive property of Vendor.',
      'Confidentiality: Both parties agree to maintain strict confidentiality of proprietary business information for 3 years beyond termination.',
      'Limitation of Liability: Vendor\'s aggregate liability shall not exceed the total fees paid in the 12 months preceding the claim.',
      `Governing Law: This Agreement is governed by the laws of the ${vendor.govLaw}.`,
      'Dispute Resolution: Disputes shall first be escalated to executive sponsors; unresolved disputes proceed to binding arbitration.',
      'Force Majeure: Neither party is liable for delays caused by events beyond reasonable control.',
      'Assignment: Customer may not assign this Agreement without prior written consent of Vendor.',
    ]);

    // ── 7. Signatures ────────────────────────────────────────────────────────
    if (doc.y > doc.page.height - 180) doc.addPage();
    doc.font('Helvetica-Bold').fontSize(11).text('7. Signatures', MARGIN, doc.y);
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).text(
      `By signing below, both parties agree to be bound by the terms and conditions of this ${vendor.contractType} as of the Effective Date stated above.`,
      MARGIN, doc.y, { width: CONTENT_WIDTH }
    );
    doc.moveDown(1.2);

    const sigY = doc.y;
    const col1 = MARGIN;
    const col2 = MARGIN + CONTENT_WIDTH / 2 + 20;
    const colW = CONTENT_WIDTH / 2 - 20;

    doc.font('Helvetica-Bold').fontSize(9)
      .text(`FOR ${vendor.legalName.toUpperCase()}`, col1, sigY, { width: colW })
      .text(`FOR ${CUSTOMER.name.toUpperCase()}`, col2, sigY, { width: colW });
    doc.moveDown(2.5);

    const lineY = doc.y;
    doc.moveTo(col1, lineY).lineTo(col1 + colW, lineY).stroke();
    doc.moveTo(col2, lineY).lineTo(col2 + colW, lineY).stroke();
    doc.moveDown(0.3);

    const nameY = doc.y;
    doc.font('Helvetica-Bold').fontSize(9)
      .text(vendor.signerVendor.name, col1, nameY, { width: colW })
      .text(vendor.signerCustomer.name, col2, nameY, { width: colW });
    doc.moveDown(0.3);

    const titleY = doc.y;
    doc.font('Helvetica').fontSize(9)
      .text(vendor.signerVendor.title, col1, titleY, { width: colW })
      .text(vendor.signerCustomer.title, col2, titleY, { width: colW });
    doc.moveDown(0.3);

    const vendorNameY = doc.y;
    doc.font('Helvetica').fontSize(9)
      .text(vendor.legalName, col1, vendorNameY, { width: colW })
      .text(CUSTOMER.name, col2, vendorNameY, { width: colW });
    doc.moveDown(0.3);

    const dateY = doc.y;
    doc.font('Helvetica').fontSize(9)
      .text(vendor.effectiveDate, col1, dateY, { width: colW })
      .text(vendor.effectiveDate, col2, dateY, { width: colW });

    // ── Footer on each page ──────────────────────────────────────────────────
    doc.flushPages();
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc.font('Helvetica').fontSize(8)
        .text(`Confidential | Page ${i + 1} of ${range.count}`, MARGIN, doc.page.height - 40, { width: CONTENT_WIDTH, align: 'left' })
        .text(`${vendor.id}`, MARGIN, doc.page.height - 40, { width: CONTENT_WIDTH, align: 'right' });
    }

    doc.end();
    stream.on('finish', () => {
      console.log(`  ✓  ${fileName}`);
      resolve(fileName);
    });
    stream.on('error', reject);
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nGenerating ${vendors.length} contract PDFs into:\n  ${OUT_DIR}\n`);
  for (const vendor of vendors) {
    await generateContract(vendor);
  }
  console.log('\nDone.\n');
}

main().catch((err) => { console.error(err); process.exit(1); });
