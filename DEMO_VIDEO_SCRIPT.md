# Rescue Relay — Demo Video Script (1–2 min)

> Real-app walkthrough — NO fake demo. Everything shown is the working app:
> real auth, real Postgres, real claims, real geofence, real impact data.

## Setup (before recording)
- Deploy the app (Vercel) with real Supabase creds + seed applied.
- Sign in as the demo org admin (`admin@rescurerelay.demo`) in one browser, and a driver in another (or incognito).
- Pre-seed: at least 2-3 donations in `available` status with pickup windows in the next 2 hours.
- Screen recorder on, 1920×1080.

## Beat sheet (~90 seconds total)

### 0:00–0:08 · Hook (landing page)
- Narrate: "Food rescue in most cities runs on WhatsApp chain-text — five photos posted, 'DM if interested,' and an hour later, 'all gone.' Rescue Relay is the lightweight relay that fixes the mechanism, not the people."
- On screen: the landing page hero "One claim. One winner. Zero food in the dumpster." Click through the mechanism section quickly.

### 0:08–0:20 · The problem is real
- Narrate: "This is documented — Foodsharing groups end threads with 'all gone,' charities run dozens of WhatsApp groups (BBC 2022). Chat has no single winner, no expiry enforcement, no proof of delivery, and no record."
- On screen: scroll the problem section (3 evidence cards).

### 0:20–0:45 · The real app — org side
- Narrate: "Here's the real app. I'm the coordinator at 412 Food Rescue. I post a donation — a donor, items, the pickup window, cold-chain requirements."
- On screen: sign in as org admin → dashboard → post a donation (fill the form, show the items, post it). It appears in the donations table with an `available` pill.

### 0:45–1:05 · The real app — the race
- Narrate: "Now the moment WhatsApp breaks. Two drivers see this donation at the same instant. They both hit Claim."
- On screen: switch to the driver view (second browser). Two tabs open the rescue. Click Claim on both — **one wins** (green "Claimed — sealed"), the other gets "Claimed by another driver." Narrate: "The database serializes this with a row lock plus a unique index — exactly one winner, every time. You can't fake a race condition."

### 1:05–1:25 · The real app — geofenced delivery
- Narrate: "The winner gets the route. Delivery only verifies if the phone is actually inside the geofence — self-reported location isn't proof."
- On screen: trip detail → pickup check-in (browser geolocation granted → green "Checked in · within geofence") → mark delivered.

### 1:25–1:40 · Impact
- Narrate: "And every rescue ticks up the public board — pounds, meals, honest outcomes including expired ones. In WhatsApp this food was 'all gone' with zero record. Here it's pounds delivered, on the record, for the neighborhood."
- On screen: /impact page — the counters, the charts, the rescue log table.

### 1:40–1:50 · Close
- Narrate: "Built for the CSC Summer Impactathon. Seeded with real Pittsburgh organizations — Light of Life, EECM, Just Harvest. One claim, one driver, one proven delivery."
- On screen: the recipients strip + footer.

## Recording tips
- Speak slowly; audio matters more than editing.
- If geolocation fails on screen, show the amber "Enable location" state — it's honest and shows error handling.
- Record in one take if possible; a single unedited take reads as more credible.
- Upload to YouTube (unlisted) — link goes in the Devpost submission.

## Panic fallback
If live anything fails: 3 screenshots (landing, claim race, impact page) already satisfy the minimum demo requirement — the video is optional-but-encouraged.
