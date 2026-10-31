# VendorLens AI

VendorLens gives organizations a single place to see what software they're paying for, when contracts renew, and where money is being wasted.

Most companies don't have a vendor problem; they have a **visibility problem**. Spend lives in spreadsheets, contracts sit in inboxes, and different teams buy overlapping tools without knowing. VendorLens is an AI visibility layer on top of that mess: it surfaces insights so finance and ops teams can act, without replacing your ERP or procurement systems.

## What it does

- **Vendor registry:** upload a CSV of spend; AI merges duplicate vendor names ("MSFT", "Microsoft Corp" → one record)
- **Contract intelligence:** upload PDFs; AI extracts renewal dates, auto-renew clauses, and key terms for human review
- **Renewal tracking:** dashboard flags contracts expiring in 30/60/90 days
- **Duplicate detection:** finds overlapping tools across departments and estimates consolidation savings
- **AI search:** ask plain-language questions like *"When does Slack renew?"* or *"Do we already pay for a CRM?"*
- **Access requests:** employees request tool access; owners approve in-app or via Slack

AI suggests; humans confirm. Extracted contract fields stay pending until someone reviews them.

---

## Setup

**You need:** Node 22+, a [Supabase](https://supabase.com) project, and an [OpenAI API key](https://platform.openai.com/api-keys).

```bash
cd vendorlens
npm install
cp .env.example .env.local   # fill in your credentials
npm run dev          # http://localhost:5173
```

**Supabase (one-time):**

1. SQL Editor → run `supabase/schema.sql`
2. Storage → create a private bucket named `contracts`
3. Sign up at `/login`, then promote yourself:

```sql
update profiles set role = 'admin' where email = 'you@company.com';
```

**Try it:** upload `sample-data/vendors.csv` and a PDF from `sample-data/`. If search misses existing data, run `npm run backfill:knowledge`.

---

## Environment

Copy `.env` → `.env.local`. Never commit `.env.local`.

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `OPENAI_API_KEY` | Yes |
| `OPENAI_MODEL` | No; defaults to `gpt-4.1-mini` |
| `APP_URL` | Yes (`http://localhost:5173` locally) |
| `SLACK_BOT_TOKEN` / `SLACK_SIGNING_SECRET` | No; access-request DMs |

---

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server (port 5173) |
| `npm run build` | Production build |
| `npm run backfill:knowledge` | Re-index vendors/contracts for AI search |

## Vercel deployment

Import the repository into Vercel as a Next.js project. Leave the build command as
`npm run build`; no output-directory override is required. Add every required value
from `.env.example` in **Vercel → Project → Settings → Environment Variables**.

Set `APP_URL` to your production URL. In Supabase Auth URL Configuration, set that
same URL as the Site URL and add
`https://<your-domain>/api/auth/callback` as a redirect URL. Create the private
`contracts` Storage bucket and apply `supabase/schema.sql` plus the migration before
the first deployment.

The OpenAI embedding model produces 768-dimensional vectors to match the existing
Supabase schema. After migrating from Gemini, run `npm run backfill:knowledge` once
to replace every stored embedding.

---

## Optional: Slack

Create an app at [api.slack.com/apps](https://api.slack.com/apps) with scopes `chat:write`, `im:write`, `users:read`, `users:read.email`. Set interactivity URL to `https://<host>/api/slack/interactions` (use ngrok locally).
