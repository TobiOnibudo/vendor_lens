# VendorLens AI

**AI-Powered Vendor Intelligence Platform**

VendorLens AI gives organizations centralized visibility into vendors, contracts, renewal timelines, duplicate tools, and spend — so teams stop overspending and start negotiating from strength.

---

## Design Document

### Problem Statement

Organizations face five critical blind spots in vendor management:

1. **No centralized vendor visibility** — vendor data is scattered across spreadsheets, emails, and department silos
2. **Duplicate tools go undetected** — different departments buy overlapping software without knowing
3. **Manual contract review** — finance teams manually parse PDFs to find renewal dates and auto-renew clauses
4. **No contract vs. spend reconciliation** — teams can't quickly compare what they're paying vs. what they agreed to
5. **Employees can't find internal tools** — new hires and cross-functional teams don't know what software already exists

### Solution

VendorLens AI is an **AI visibility layer** that augments human decision-making. It does NOT replace ERP, procurement, or legal systems. It surfaces insights so humans can act.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js 16 (App Router)             │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │Dashboard │  │ Vendors  │  │Contracts │  │  AI    │  │
│  │  Page    │  │  + CSV   │  │  + PDF   │  │ Search │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  │
│       │              │              │             │      │
│  ┌────┴──────────────┴──────────────┴─────────────┴──┐  │
│  │              API Routes (Server-side)             │  │
│  └────┬──────────────┬──────────────┬────────────────┘  │
│       │              │              │                    │
└───────┼──────────────┼──────────────┼────────────────────┘
        │              │              │
   ┌────▼────┐    ┌────▼────┐   ┌────▼────┐
   │Supabase │    │Supabase │   │ OpenAI  │
   │PostgreSQL│    │ Storage │   │  API    │
   │+ pgvector│    │ (PDFs)  │   │(GPT-4o) │
   └─────────┘    └─────────┘   └─────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend + Backend** | Next.js 16 (App Router) | Full-stack React with server-side API routes |
| **Database** | PostgreSQL via Supabase | Vendors, contracts, spend records, access requests |
| **Vector Search** | pgvector (Supabase) | Semantic similarity search for vendor data |
| **Authentication** | Supabase Auth | Email/password + Google/Microsoft SSO |
| **File Storage** | Supabase Storage | Contract PDF uploads |
| **AI** | OpenAI GPT-4o-mini | Contract extraction, vendor clustering, chat |
| **Embeddings** | OpenAI text-embedding-3-small | Vendor similarity and semantic search |
| **Styling** | Tailwind CSS v4 | Utility-first CSS framework |
| **Deployment** | Vercel | Edge-optimized hosting |

### Design Principles

1. **AI surfaces, humans decide** — Every AI-generated insight requires human confirmation before action
2. **Progressive disclosure** — Start with a clean dashboard, drill into details on demand
3. **Enterprise-grade UX** — Clean, minimal, professional UI that finance and ops teams actually want to use
4. **Simplicity over complexity** — Single Next.js codebase, no separate backend service
5. **Graceful degradation** — The app works even if AI calls fail; features degrade, never crash

---

## Features

### 1. Dashboard

The central command center displaying:

- **Total Vendors** — Active vendor count with link to vendor list
- **Annual Spend** — Aggregated spend across all vendors
- **Upcoming Renewals** — 30/60/90 day renewal timeline with urgency badges
- **Duplicate Alerts** — Flagged overlapping tools with estimated savings
- **Top Vendors by Spend** — Quick view of highest-spend vendors
- **Pending Access Requests** — Outstanding requests needing approval
- **Consolidation Savings Banner** — Estimated savings from duplicate tool elimination

### 2. Vendor & Spend Upload

**Flow:** CSV Upload → Column Auto-Mapping → Preview → AI Processing → Done

- **Smart CSV Parser** — Drag-and-drop upload with automatic column detection
- **AI Name Clustering** — OpenAI normalizes vendor name variations (e.g., "Microsoft Corp", "MSFT", "Microsoft Inc." → "Microsoft")
- **Department Tagging** — Each vendor is tagged by department for cross-org visibility
- **Spend Tracking** — Total and annual spend calculated per vendor
- **Embedding Generation** — Each vendor gets a semantic embedding for AI search

### 3. Contract Intelligence

**Flow:** PDF Upload → AI Extraction → Human Review → Confirmation

AI extracts from contract PDFs:
- Renewal date
- Auto-renew clause (boolean)
- Notice period (days)
- Contract value
- Pricing escalation terms
- Key terms/clauses
- 2-3 sentence AI summary

**Renewal Timeline:**
- **Critical (≤30 days)** — Red badge, immediate attention
- **Warning (31-60 days)** — Amber badge, start planning
- **Upcoming (61-90 days)** — Blue badge, awareness
- **Safe (>90 days)** — Green badge

Human-in-the-loop: All AI-extracted data shows as "Pending Review" until a human confirms the fields.

### 4. Duplicate & Overlap Detection

- **AI-Powered Scan** — Analyzes all vendors using GPT-4o-mini to find overlapping functionality
- **Group Visualization** — Duplicates grouped by functional overlap (e.g., "Project Management: Asana, Monday, Jira")
- **Savings Estimation** — Calculates potential consolidation savings based on overlap percentage
- **Three-state workflow:** Flagged → Reviewed → Dismissed

### 5. AI Search Assistant

The primary wedge feature. A conversational interface that answers natural-language questions:

- "Do we already use a CRM?"
- "When does our Slack contract renew?"
- "Who owns the Figma subscription?"
- "Are we paying for two design tools?"

**How it works:**
1. User question → OpenAI embedding
2. Semantic search against vendor embeddings (pgvector)
3. Context enrichment with all vendor, contract, and duplicate data
4. GPT-4o-mini generates a cited, contextual answer
5. Source badges show how many vendors/contracts were searched

**Rules:**
- Only references internal uploaded data
- Cites specific dates, costs, and vendor names
- Suggests negotiation timing for upcoming renewals
- Identifies similar/duplicate tools proactively

### 6. Access Request Flow

Simple licensing workflow:

1. Employee clicks "Request Access" on any vendor
2. Fills out name, email, vendor, and reason
3. Request routed to vendor owner (or admin)
4. Owner approves/denies with one click
5. Status tracked: Pending → Approved/Denied

### 7. Authentication & RBAC

**Auth Methods:**
- Email/password (Supabase Auth)
- Google SSO (placeholder configured)
- Microsoft SSO (placeholder configured)
- Auto-provisioning by company domain

**Roles:**

| Role | Permissions |
|------|------------|
| **Admin** | Full access — manage users, vendors, contracts, settings |
| **Finance** | Upload vendors/contracts, view spend, manage duplicates |
| **Department Head** | View department vendors, approve access requests |
| **Employee** | Search vendors, request access, view basic info |

---

## Database Schema

### Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User profiles (extends Supabase Auth) | role, department, company_domain |
| `vendors` | Vendor registry | name, category, department, annual_spend |
| `contracts` | Contract metadata + AI extractions | renewal_date, auto_renew, contract_value, summary |
| `spend_records` | Granular spend line items | vendor_id, amount, department, period |
| `access_requests` | Tool access request workflow | vendor_id, requester_id, status |
| `duplicate_groups` | AI-detected duplicate tool groups | vendor_names, estimated_overlap_pct |
| `vendor_embeddings` | Vector embeddings for semantic search | vendor_id, embedding (1536-dim) |

### Key Functions

- `match_vendors(query_embedding, threshold, count)` — pgvector similarity search
- `handle_new_user()` — Auto-creates profile on signup with domain extraction

### Row-Level Security

All tables have RLS enabled:
- Authenticated users can read vendor/contract data
- Only admin/finance roles can write vendor/contract data
- Users can only see their own access requests (admins see all)
- Profiles are user-scoped with admin override

---

## Project Structure

```
vendorlens/
├── src/
│   ├── app/
│   │   ├── globals.css              # Tailwind v4 config + animations
│   │   ├── layout.tsx               # Root layout with Toaster
│   │   ├── page.tsx                 # Landing page
│   │   ├── login/page.tsx           # Auth page (email + OAuth)
│   │   ├── (app)/                   # Authenticated app layout
│   │   │   ├── layout.tsx           # Sidebar + main content
│   │   │   ├── dashboard/page.tsx   # Dashboard
│   │   │   ├── vendors/page.tsx     # Vendor list + CSV upload
│   │   │   ├── contracts/page.tsx   # Contract list + PDF upload
│   │   │   ├── duplicates/page.tsx  # Duplicate detection
│   │   │   ├── search/page.tsx      # AI search assistant
│   │   │   ├── access/page.tsx      # Access requests
│   │   │   └── settings/page.tsx    # Settings & RBAC
│   │   └── api/
│   │       ├── auth/callback/       # OAuth callback handler
│   │       ├── vendors/upload/      # CSV processing + AI clustering
│   │       ├── contracts/upload/    # PDF upload + AI extraction
│   │       ├── contracts/confirm/   # Human confirmation endpoint
│   │       ├── duplicates/scan/     # AI duplicate detection
│   │       ├── search/             # AI search endpoint
│   │       └── access/             # Access request CRUD
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx          # Collapsible navigation
│   │   │   └── header.tsx           # Page header with search
│   │   ├── ui/                      # Reusable UI primitives
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── table.tsx
│   │   │   └── textarea.tsx
│   │   └── vendors/
│   │       └── csv-upload.tsx       # Multi-step CSV upload wizard
│   ├── lib/
│   │   ├── openai.ts               # OpenAI client + all AI functions
│   │   ├── types.ts                # TypeScript type definitions
│   │   ├── utils.ts                # Utility functions
│   │   └── supabase/
│   │       ├── client.ts           # Browser Supabase client
│   │       └── server.ts           # Server Supabase clients
│   └── middleware.ts               # Auth protection middleware
├── supabase/
│   └── schema.sql                  # Full database schema with RLS
├── .env.local                      # Environment variables (placeholder)
├── next.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))
- An OpenAI API key ([platform.openai.com](https://platform.openai.com))

### Setup

1. **Clone and install:**

```bash
cd vendorlens
npm install
```

2. **Configure environment variables:**

Edit `.env.local` and replace the placeholders:

```env
# Get from Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Get from OpenAI Dashboard
OPENAI_API_KEY=sk-your-api-key
```

3. **Set up the database:**

Go to your Supabase project → SQL Editor → Run the contents of `supabase/schema.sql`.

4. **Create the storage bucket:**

In Supabase Dashboard → Storage → Create bucket named `contracts` (private).

5. **Configure OAuth (optional):**

In Supabase Dashboard → Authentication → Providers:
- Enable Google and add your OAuth credentials
- Enable Azure (Microsoft) and add your OAuth credentials

6. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deployment to Vercel

```bash
npm install -g vercel
vercel
```

Set environment variables in Vercel project settings.

---

## API Reference

### `POST /api/vendors/upload`
Upload and process vendor CSV data with AI name clustering.

**Body:** `{ rows: [{ vendor_name, amount, department, category?, description?, period? }] }`

**Returns:** `{ success, vendorsProcessed, clusters, vendors }`

### `POST /api/contracts/upload`
Upload contract PDF for AI extraction.

**Body:** `FormData` with `file` (PDF) and optional `vendor_id`

**Returns:** `{ success, contract, extracted }`

### `POST /api/contracts/confirm`
Confirm AI-extracted contract data (human-in-the-loop).

**Body:** `{ contractId, updates }`

### `POST /api/duplicates/scan`
Run AI duplicate detection across all vendors.

**Returns:** `{ success, duplicates, scannedVendors }`

### `POST /api/search`
AI-powered natural language search over vendor data.

**Body:** `{ question: string }`

**Returns:** `{ success, answer, sources }`

### `POST /api/access`
Create an access request.

**Body:** `{ vendorId, reason?, requesterId?, requesterName?, requesterEmail? }`

### `PATCH /api/access`
Approve or deny an access request.

**Body:** `{ requestId, status: "approved" | "denied", approverId? }`

---

## AI Models Used

| Model | Purpose | Why |
|-------|---------|-----|
| `gpt-4o-mini` | Contract extraction, vendor clustering, duplicate detection, chat | Cost-effective, fast, accurate for structured extraction |
| `text-embedding-3-small` | Vendor embeddings for semantic search | 1536-dim vectors, good accuracy/cost ratio |

---

## Human-in-the-Loop Design

VendorLens AI explicitly preserves human agency:

| Action | AI Does | Human Does |
|--------|---------|------------|
| Vendor name normalization | Suggests clusters | Validates merged names |
| Contract extraction | Extracts fields from PDF | Confirms or edits extracted data |
| Duplicate detection | Flags overlapping tools | Decides whether to consolidate |
| Access requests | Routes to owner | Approves or denies |
| Search answers | Generates cited response | Verifies and acts on answer |

---

## TODO Items

Search the codebase for `#TODO` to find all placeholder items that need your credentials and configuration:

- `#TODO` in `.env.local` — Supabase and OpenAI credentials
- `#TODO` in `src/lib/openai.ts` — OpenAI API key
- `#TODO` in `src/app/login/page.tsx` — OAuth provider configuration
- `#TODO` in `src/app/api/access/route.ts` — Email/Slack notification integration
- `#TODO` in `src/components/layout/sidebar.tsx` — Wire up sign out
- `#TODO` in `src/app/(app)/settings/page.tsx` — API key validation check

---

## Future Roadmap

These features are designed into the architecture but not built in the MVP:

- **Contract vs. Invoice Variance** — Compare contract value against actual spend
- **Underutilized License Detection** — Track seat-level usage
- **ERP/Accounting Integrations** — Sync with QuickBooks, NetSuite, SAP
- **Auto-Renew Cancellation Workflows** — Automated cancellation reminders
- **Negotiation Recommendation Engine** — AI-suggested negotiation strategies
- **Clause Deviation Detection** — Compare contracts against a standard playbook
- **Department Chargeback** — Allocate vendor costs back to departments

---

## License

MIT

---

Built with Next.js, Supabase, OpenAI, and Tailwind CSS.
