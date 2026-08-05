# Rescue Relay — Devpost Submission Draft

> Ready to paste into the CSC Summer Impactathon submission. Edit names/links before submitting.

## Title
**Rescue Relay — from "all gone" to "all accounted for"**

## Tagline
The lightweight relay that turns food-rescue chain-text into an auditable loop — one claim, one driver, one proven delivery.

## Description (~700 words)

### The problem
Surplus food in most cities is rescued through WhatsApp chain-text: a coordinator posts five photos, people DM "interested," and an hour later the thread reads "all gone." This is documented — a Foodsharing group's thread ended exactly that way (Sentient Media, 2023), and the BBC (2022) reported charities running dozens of food WhatsApp groups where 165 donated sandwiches vanished in an hour. Chat has no single winner, no expiry enforcement, no proof of delivery, and no record.

### Who it affects
Small food-rescue organizations in Pittsburgh — Light of Life Rescue Mission (North Side, 509,600+ lbs distributed in 2025), East End Cooperative Ministry (East Liberty), Just Harvest, Wilkinsburg Community Ministry, and others. Pittsburgh is where the modern US food-rescue movement started (412 Food Rescue, 2015), yet the smallest orgs still coordinate on group texts. One coordinator, a couple of volunteer drivers, and a perishable window.

### What it does
A five-step relay:
1. **Post** — a donor posts one photo of surplus food.
2. **Classify** — an AI vision model turns the photo into a structured listing (item, quantity, perishability, cold-chain) in under a second.
3. **Claim** — drivers nearby claim it; **exactly one claim wins**.
4. **Deliver** — the winner gets a route; delivery verifies only inside a geofence.
5. **Impact** — every rescue ticks up a public board: pounds, meals, CO₂ avoided.

### Why it's different
Two mechanisms that can't be faked:
- **The atomic claim.** A Postgres row lock (`SELECT … FOR UPDATE`) plus a partial unique index guarantee two drivers can never both win the same perishable pickup. This is a real race condition — the exact moment WhatsApp breaks — solved at the database layer.
- **AI at the edge, not a wrapper.** The vision model extracts structured data from one photo, then gets out of the way. There is no chatbot inventing answers, because a hallucinated food-safety claim is worse than no AI at all. When the AI is unavailable, the app degrades gracefully with visible fallbacks — never a crash.

### Impact
Every rescue is measurable: pounds not landfilled, meals served, cold-chain verified. The public impact board renders honest data — including rescues that expired — because the point is trust, not a perfect score.

### What I learned
Building solo forced me to learn real systems material: what a race condition actually is when two users claim the same database row (and that the fix lives in Postgres, not the browser); row-level security (policies live in the database, not app code); why the claim must run in the database; vision prompting that extracts strict JSON with a three-layer fallback; geofencing math (haversine, server-side, because self-reported location isn't proof); and seed-data design — a demo only looks real if every organization, address, and donor in it is real.

### Built with
Next.js 14 · Supabase (Postgres, RLS, Auth, Storage) · NVIDIA NIM vision · Recharts · Tailwind CSS · Vercel · GitHub Pages-ready. Seed data: real, verified Pittsburgh organizations.

## AI-use disclosure

> **AI-use disclosure for Rescue Relay**
>
> This project was built solo. AI tools (Claude for coding assistance, NVIDIA NIM for the photo classifier) were used as tools, and I can explain every line.
>
> **What AI did:** helped scaffold the Next.js boilerplate; suggested component patterns and Tailwind classes; debugged compile errors; suggested prompt phrasing for the photo classifier; helped draft this description.
>
> **What I did (and can explain):** designed the data model and every table; wrote the `claim_donation()` function and the unique index that make claims atomic; wrote all row-level security policies; chose the server-side geofence check; wrote the fallback logic so the AI can never break the flow; verified every Pittsburgh organization in the seed data is real; tested the concurrency race end-to-end; deployed it.
>
> **Why AI didn't build it for me:** the interesting parts — concurrency, RLS, verification — are judgment calls about failure modes. An AI tool can suggest them, but it can't take responsibility for them. If you ask me how two claims can't both win, I can show you the index and the lock.

## Submission checklist
- [ ] Live demo URL (Vercel): TBD
- [ ] GitHub repo: TBD (public)
- [ ] Demo video (1–2 min, real app walkthrough): TBD
- [ ] Screenshots (3): TBD
- [ ] Team member names: TBD
- [ ] Tools/APIs/AI list: Next.js, Supabase, NVIDIA NIM, Recharts, Tailwind, Vercel
- [ ] **Sponsor / Special Prizes opt-in checked** (required for any prize)
- [ ] Submit ≥2 hours before Aug 9 11:59 PM PDT
