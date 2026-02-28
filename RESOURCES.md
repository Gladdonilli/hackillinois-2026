# HackIllinois 2026 — Free Resources & Access Map

> **Purpose**: Complete inventory of free tools, credits, and access points available during the hackathon, mapped to LARYNX's needs.
>
> **Key Distinction**: AI used during *development* (Cliproxy, OpenCode, agents) is NOT disclosed. Only AI the *product* uses post-development requires README disclosure per HackIllinois AI policy.

---

## Product-Facing AI (Requires README Disclosure)

These are the AI services LARYNX's end-users interact with through the product:

| Service | Role in LARYNX | Free Tier / Access |
|---------|--------------|-------------------|
| **OpenAI API** | TTS audio generation for deepfake test samples | Real API key needed for TTS sample generation. Dev uses Cliproxy. |
| **Cloudflare Workers AI** | BGE embeddings for audio fingerprinting (optional) | 10K neurons/day free. No CC needed. |
| **Supermemory** | Memory layer — analysis history, user profiles | Account already active. Visit booth for rate-limit top-up. |

---

## Core Infrastructure (Free Tier — No CC Required)

### Cloudflare Developer Platform

| Service | Free Tier Limit | Sufficient for 36h? | Setup |
|---------|----------------|---------------------|-------|
| **Workers** | 100K req/day, 10ms CPU/invocation | ✅ Yes | `npx wrangler login` |
| **D1 (SQL)** | 5M reads/day, 100K writes/day, 500MB/db | ✅ Yes — use for claims/scores | `npx wrangler d1 create larynx-db` |
| **R2 (Storage)** | 10GB, 1M writes, 10M reads/mo, zero egress | ✅ Yes | Via wrangler CLI |
| **Vectorize** | 200K vectors, 1,536 dims, 30M queries/mo | ✅ Yes | Via wrangler CLI |
| **AI Gateway** | Unlimited routing, 100K logs/mo | ✅ Yes | Dashboard setup |
| **Workers AI** | 10K neurons/day | ✅ Yes | Via Workers bindings |
| **Pages** | 500 builds/mo, unlimited bandwidth | ✅ Yes | `npx wrangler pages deploy` |
| **KV** | 100K reads/day, **1K writes/day** ⚠️ | ⚠️ Bottleneck — use D1 instead | Avoid for high-write |

> **$5K Cloudflare credits = PRIZE ONLY.** No upfront credits. Free tier is sufficient for the hackathon.

### Setup Flow
```bash
# 1. Sign up at dash.cloudflare.com (no credit card)
# 2. Verify email
# 3. Install & auth wrangler
npm install -g wrangler
npx wrangler login          # browser auth
# 4. Provision services
npx wrangler d1 create larynx-db
npx wrangler r2 bucket create larynx-audio
npx wrangler vectorize create larynx-vectors --dimensions 768 --metric cosine
```

---

## Sponsor Credits & Resources

### Modal ($250 Upfront Credits)
- **What**: GPU/inference compute credits
- **How**: Create account at `modal.com` → Billing → Enter promo code `VVN-YQS-E55`
- **Relevance**: Primary track. LARYNX runs AAI inference on Modal GPU. Credits essential.
- **Prize**: Winning adds $5K credits + SF/NY trip

### OpenAI (Free via Cliproxy During Dev)
- **During dev**: Route through Cliproxy — unlimited free access to all OpenAI models
- **For demo/submission**: Need real OpenAI API key to prove "Best Use of OpenAI API" sponsor challenge
- **Action**: Obtain API key before Sunday 6AM submission deadline

### Supermemory (Account Already Active)
- **Status**: Account active, API key in use
- **Action**: Visit booth at Company Expo for rate-limit top-up for the weekend
- **Prize**: Meta Ray-Bans for winning their challenge

---

## MLH Partner Freebies

| Resource | What | How to Claim |
|----------|------|-------------|
| **DigitalOcean** | $200 cloud credits | `mlh.link/digitalocean-agentic-cloud` |
| **.Tech Domain** | Free .tech domain (1yr, 10yr if win) | `get.tech` + MLH promo code from Discord `#announcements` |
| **Google AI Studio** | Massive free tier Gemini 1.5 Pro/Flash | `aistudio.google.com` (active by default) |
| **ElevenLabs** | Standard free tier (earbuds if integrate) | Sign up at site |

---

## Friday 3PM Company Expo — Priority Booth Stops

1. **Supermemory** — Account rate-limit top-up
2. **Cloudflare** — Exact grading rubric for $5K challenge
3. **Modal** — Confirm promo code redemption (if choosing Modal track)

---

## Pre-Kickoff Setup Checklist

```
□ Cloudflare account created (dash.cloudflare.com, no CC)
□ npx wrangler login (browser auth)
□ Modal account + redeem VVN-YQS-E55 (if Modal track)
□ Visit Supermemory booth → rate limit top-up
□ Visit Cloudflare booth → confirm challenge rubric
□ Claim .tech domain from Discord #announcements
□ DigitalOcean $200 credits → mlh.link/digitalocean-agentic-cloud
□ Google AI Studio → aistudio.google.com
□ Start auto-push daemon: ./scripts/jj-autopush.sh &
□ Flip repo to public before Sun 6AM: gh repo edit Gladdonilli/hackillinois --visibility public
```

---

## ⚠️ Key Gotchas

| Gotcha | Detail |
|--------|--------|
| **KV writes cap** | Only 1,000 writes/day — use D1 for all write-heavy storage |
| **Cloudflare $5K = prize only** | No upfront credits, free tier during hack |
| **OpenAI key = demo only** | Use Cliproxy for dev, real key for final submission |
| **Repo visibility** | Must be PUBLIC before Devpost deadline (Sun 6AM) |
| **AI disclosure** | README must list product-facing AI only (AAI model, OpenAI TTS for samples, Workers AI if used) |
