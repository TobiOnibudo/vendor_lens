# VendorLens AI

**AI-powered vendor intelligence** — centralized visibility into vendors, contracts, renewals, duplicate tools, and spend.

VendorLens helps finance and ops teams stop overspending and negotiate from strength. It is an **AI visibility layer** that augments human decision-making; it does not replace ERP, procurement, or legal systems.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [First-Time Setup Checklist](#first-time-setup-checklist)
- [Sample Data](#sample-data)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Features](#features)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Slack Integration (Optional)](#slack-integration-optional)
- [Deployment](#deployment)
- [Design Principles](#design-principles)

---

## Quick Start

### Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js 18+** | LTS recommended |
| **Supabase project** | [supabase.com](https://supabase.com) — Postgres + Auth + Storage |
| **Gemini API key** | [Google AI Studio](https://aistudio.google.com/app/apikey) |

### 1. Install dependencies

```bash
cd vendorlens
npm install
```

### 2. Configure environment

Copy the template and fill in your credentials:

```bash
cp .env .env.local
```

See [Environment Variables](#environment-variables) below for what each key does.

### 3. Set up the database

In your Supabase project → **SQL Editor**, run these files in order:

1. `supabase/schema.sql` — tables, RLS policies, and functions
2. `supabase/migrations/20260517000000_knowledge_chunks.sql` — only if not already included in schema.sql

### 4. Create storage bucket

In Supabase Dashboard → **Storage** → create a **private** bucket named `contracts`.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

> The app runs on port **5173** by default (configured in `package.json` and `.env.local`).

### 6. Create your first user

Sign up at `/login`. A profile is auto-created from your email domain. To grant admin access, update your row in the `profiles` table:

```sql
update profiles set role = 'admin' where email = 'you@yourcompany.com';
```

---

## Environment Variables

Copy `.env` → `.env.local` and set the values below. **Never commit `.env.local`.**

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Dev server port (default: `5173`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-side only) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI features |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL (e.g. `http://localhost:5173`) |
| `APP_URL` | Yes | Same as above; used for server-side links |
| `SLACK_BOT_TOKEN` | No | Slack bot token for approval DMs |
| `SLACK_SIGNING_SECRET` | No | Slack app signing secret |

Example `.env.local`:

```env
PORT=5173

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

GEMINI_API_KEY=your-gemini-api-key

NEXT_PUBLIC_APP_URL=http://localhost:5173
APP_URL=http://localhost:5173

# Optional — see Slack Integration section
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
```

---

## First-Time Setup Checklist

Use this after Quick Start to verify everything works end-to-end:

- [ ] Dev server loads at `http://localhost:5173`
- [ ] You can sign up / log in via Supabase Auth
- [ ] Upload `sample-data/vendors.csv` on the **Vendors** page
- [ ] Upload a contract PDF from `sample-data/` on the **Contracts** page
- [ ] Confirm extracted contract fields (human-in-the-loop review)
- [ ] Ask a question on the **Search** page (e.g. *"When does our Slack contract renew?"*)
- [ ] Run `npm run backfill:knowledge` if search returns no results for existing data

### OAuth (optional)

In Supabase Dashboard → **Authentication → Providers**:

- Enable **Google** and add OAuth credentials
- Enable **Azure (Microsoft)** and add OAuth credentials

---

## Sample Data

The `sample-data/` folder includes everything you need to explore the app locally:

| File | Purpose |
|------|---------|
| `vendors.csv` | 30 vendors with intentional name duplicates (e.g. "Salesforce" / "salesforce.com") |
| `*-contract-2025.pdf` | Sample contract PDFs for major vendors |
| `generate-contracts.js` | Script that generated the sample PDFs |

**Suggested onboarding flow:**

1. Upload `vendors.csv` → watch AI cluster duplicate vendor names
2. Upload a few contract PDFs → review AI-extracted renewal dates and terms
3. Run duplicate scan → see overlapping tools flagged
4. Use AI Search → ask natural-language questions about your data

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 5173 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run backfill:knowledge` | Index existing vendors/contracts into `knowledge_chunks` for RAG search |

---

## Project Structure

```
vendorlens/
├── src/
│   ├── app/
│   │   ├── (app)/              # Authenticated pages (dashboard, vendors, search, …)
│   │   ├── api/                # Server-side API routes
│   │   ├── login/              # Auth page
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── layout/             # Sidebar, header
│   │   ├── ui/                 # Reusable UI primitives
│   │   └── vendors/            # CSV upload, owner select
│   ├── lib/
│   │   ├── ai.ts               # Gemini client (extraction, clustering, embeddings)
│   │   ├── rag.ts              # Knowledge chunk indexing and retrieval
│   │   ├── agent/              # AI search agent (tools + run loop)
│   │   ├── access/             # Access request resolution
│   │   ├── slack.ts            # Slack approval notifications
│   │   └── supabase/           # Browser + server Supabase clients
│   └── proxy.ts                # Auth protection for app routes
├── supabase/
│   ├── schema.sql              # Full database schema
│   ├── migrations/             # Incremental schema changes
│   └── seed-contracts.sql      # Optional seed data
├── sample-data/                # CSV + PDF fixtures for local dev
├── scripts/
│   └── backfill-knowledge-chunks.ts
├── .env                        # Env template (safe to commit)
└── .env.local                  # Your secrets (gitignored)
```

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
   │Supabase │    │Supabase │   │ Gemini  │
   │PostgreSQL│    │ Storage │   │  API    │
   │+ pgvector│    │ (PDFs)  │   │(Flash + │
   └─────────┘    └─────────┘   │Embedding)│
                                 └─────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Full stack** | Next.js 16 (App Router) | React UI + server-side API routes |
| **Database** | PostgreSQL via Supabase | Vendors, contracts, spend, access requests |
| **Vector search** | pgvector + `knowledge_chunks` | Semantic RAG search over vendor/contract data |
| **Auth** | Supabase Auth | Email/password + Google/Microsoft SSO |
| **Storage** | Supabase Storage | Contract PDF uploads |
| **AI** | Google Gemini 2.5 Flash | Extraction, clustering, duplicate detection, chat |
| **Embeddings** | Gemini Embedding 001 (768-dim) | Semantic search and RAG retrieval |
| **Styling** | Tailwind CSS v4 | Utility-first CSS |
| **Deployment** | Vercel | Edge-optimized hosting |

---

## Features

### Dashboard

Central command center: vendor count, annual spend, renewal timeline (30/60/90 days), duplicate alerts, top vendors, and pending access requests.

### Vendor & Spend Upload

**Flow:** CSV upload → column auto-mapping → preview → AI name clustering → done

- Smart CSV parser with drag-and-drop
- AI normalizes vendor name variations (e.g. "Microsoft Corp", "MSFT" → "Microsoft")
- Department tagging and spend aggregation
- Automatic knowledge chunk indexing for search

### Contract Intelligence

**Flow:** PDF upload → AI extraction → human review → confirmation

Extracts renewal date, auto-renew clause, notice period, contract value, pricing escalation, key terms, and a summary. All extracted data stays **Pending Review** until a human confirms.

| Renewal window | Badge |
|----------------|-------|
| ≤ 30 days | Critical (red) |
| 31–60 days | Warning (amber) |
| 61–90 days | Upcoming (blue) |
| > 90 days | Safe (green) |

### Duplicate & Overlap Detection

AI scans vendors for overlapping functionality, groups them (e.g. "Project Management: Asana, Monday, Jira"), and estimates consolidation savings. Workflow: **Flagged → Reviewed → Dismissed**.

### AI Search Assistant

Natural-language questions over your uploaded data:

- *"Do we already use a CRM?"*
- *"When does our Slack contract renew?"*
- *"Who owns the Figma subscription?"*

Uses RAG: question → embedding → `match_knowledge_chunks` → agent with tools → cited answer.

### Access Request Flow

1. Employee requests access to a vendor
2. Request routes to the vendor owner (or admin)
3. Owner approves/denies in-app (or via Slack DM if configured)

### Authentication & RBAC

| Role | Permissions |
|------|------------|
| **Admin** | Full access — users, vendors, contracts, settings |
| **Finance** | Upload vendors/contracts, view spend, manage duplicates |
| **Department Head** | View department vendors, approve access requests |
| **Employee** | Search vendors, request access, view basic info |

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends Supabase Auth) — role, department, company domain |
| `vendors` | Vendor registry — name, category, department, annual spend, owner |
| `contracts` | Contract metadata + AI extractions |
| `spend_records` | Granular spend line items |
| `access_requests` | Tool access request workflow |
| `duplicate_groups` | AI-detected duplicate tool groups |
| `knowledge_chunks` | RAG chunks with 768-dim embeddings (primary search index) |
| `vendor_embeddings` | Legacy embeddings table (prefer `knowledge_chunks`) |

### Key Functions

- `match_knowledge_chunks(query_embedding, threshold, count)` — pgvector similarity search for RAG
- `match_vendors(query_embedding, threshold, count)` — legacy vendor embedding search
- `handle_new_user()` — auto-creates profile on signup

Row-level security (RLS) is enabled on all tables. Authenticated users can read vendor/contract data; only admin/finance roles can write vendor/contract data.

Full schema: `supabase/schema.sql`

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

## Slack Integration (Optional)

VendorLens can send access-request approval DMs in Slack.

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Add bot scopes: `chat:write`, `im:write`, `users:read`, `users:read.email`
3. Set **Interactivity URL** to `https://<your-host>/api/slack/interactions`
4. Add `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` to `.env.local`

For local development, expose your server with [ngrok](https://ngrok.com) and use the ngrok URL as the interactivity endpoint.

---

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

Set all environment variables from [Environment Variables](#environment-variables) in your Vercel project settings. Update `NEXT_PUBLIC_APP_URL` and `APP_URL` to your production domain.

---

## Design Principles

1. **AI surfaces, humans decide** — Every AI insight requires human confirmation before action
2. **Progressive disclosure** — Clean dashboard first, details on demand
3. **Enterprise-grade UX** — Minimal, professional UI for finance and ops teams
4. **Simplicity over complexity** — Single Next.js codebase, no separate backend
5. **Graceful degradation** — App works even if AI calls fail; features degrade, never crash

### Human-in-the-Loop

| Action | AI does | Human does |
|--------|---------|------------|
| Vendor name normalization | Suggests clusters | Validates merged names |
| Contract extraction | Extracts fields from PDF | Confirms or edits extracted data |
| Duplicate detection | Flags overlapping tools | Decides whether to consolidate |
| Access requests | Routes to owner | Approves or denies |
| Search answers | Generates cited response | Verifies and acts on answer |

---

## AI Models

| Model | Purpose |
|-------|---------|
| `gemini-2.5-flash` | Contract extraction, vendor clustering, duplicate detection, chat |
| `gemini-embedding-001` | 768-dim embeddings for semantic search and RAG |
