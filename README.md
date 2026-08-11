# Rescue Relay

**From chain-text to check-in.** The lightweight relay that turns food-rescue chain-text into an auditable loop — one claim, one driver, one proven delivery.

Built for the **CSC Summer Impactathon**. Seeded with real, verified Pittsburgh food-relief organizations.

## The problem

In most cities, surplus food is rescued through WhatsApp chain-text: a coordinator posts five photos, people DM "interested," and an hour later the thread reads "all gone." Chat has no single winner, no expiry enforcement, no proof of delivery, and no record.

- Foodsharing groups post photos and lose track within the hour (Sentient Media, 2023).
- Charities run dozens of WhatsApp groups; 165 donated sandwiches vanished in an hour (BBC, 2022).

## What Rescue Relay does

A five-step relay:

1. **Post** — a donor posts one photo of surplus food.
2. **Classify** — an AI vision model turns the photo into a structured listing (item, quantity, perishability, cold-chain) in under a second.
3. **Claim** — drivers see it and claim it; **exactly one claim wins** (atomic, race-condition-safe).
4. **Deliver** — the winner gets a route; delivery verifies only inside a geofence.
5. **Impact** — every rescue ticks up a public board: pounds, meals, CO₂.

## Why it's different

Two mechanisms that can't be faked:

- **Atomic claim** — a Postgres row lock (`SELECT … FOR UPDATE`) plus a partial unique index guarantee two drivers can never both win the same perishable pickup.
- **AI at the edge, not a wrapper** — the vision model extracts structured data from one photo, then gets out of the way. No chatbot inventing answers (a hallucinated food-safety claim is worse than no AI).

## Tech stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** — Postgres (RLS, atomic-claim RPC), Auth, Storage
- **NVIDIA NIM vision** (`meta/llama-3.2-90b-vision-instruct`) — photo classifier with graceful 3-layer fallback
- **Recharts** — live impact visualizations
- **Tailwind CSS** — dark-first design system
- **Vercel** — deployment

## Run locally

```bash
npm install
# set env vars in .env.local (see .env.example)
npm run dev
```

## Structure

- `src/app/` — routes (landing, /impact, /dashboard/org, /dashboard/driver, auth)
- `src/app/api/` — route handlers (donations, claims, check-ins, trips, impact, classify)
- `src/lib/` — Supabase clients, geofence, AI classifier, helpers
- `src/types/` — shared TypeScript types
- `supabase/schema.sql` — full schema: tables, enums, RLS, atomic-claim RPC, storage
- `supabase/seed.sql` — verified Pittsburgh orgs, donors, demo data

## AI-use disclosure

AI tools (Claude for coding assistance, NVIDIA NIM for the photo classifier) were used as tools. The problem, the data model, the atomic-claim RPC, all RLS policies, the geofence verification, and the fallback logic were designed and tested by hand; AI helped scaffold, debug, and phrase. Every line is explainable.

