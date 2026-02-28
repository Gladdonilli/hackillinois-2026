# HackIllinois 2026 — Complete Knowledge Base

> Exhaustive reference for resuming hackathon planning. Contains ALL knowledge from Supermemory + conversation history. Nothing omitted.

---

## 1. Project Decision

**Project: Prism** — Multi-model divergence analyzer with embedded claim verification on divergent responses.

**Track:** Voyager ($5K, Shark Tank judging — presentation-focused, favors polished demos)

**Team Status:** Going solo most likely. Also DMed ryun's team (Ryan Ni — 13 hackathon wins, incoming OpenAI, won Codex Hackathon $10K with "Yolodex") via Instagram as potential 4th. Belle (Math+Arts UIUC freshman) contacted for design help but likely General track, not viable for Voyage team.

**Key Strategic Insight:** Sponsor prizes (Supermemory, Cloudflare, OpenAI — track-agnostic) are where prize stacking happens; main track prize ($5K vs $2.5K) is secondary to demo quality and sponsor challenge alignment.

**Why Prism over alternatives:**
- Oracle recommends Prism as #1: highest prize stacking (OpenAI+Cloudflare+SM+UI/UX), best feasibility for parallel agents, clearest demo narrative.
- ZERO hackathon winners in statistical divergence space 2024-2026 — completely untouched.
- Best natural showcase of both Cloudflare AI Gateway (multi-model routing is literally what it's for) and Supermemory (memory-driven UX, not generic RAG).

**Prism = Comparison + Verification combined:**
Fan out a query to 3-5 models → compute divergence stats (JSD, cosine similarity) → visualize agreement heatmap → extract claims from the most-divergent response and cross-check against the consensus. Best of both Prism and Sieve concepts in one product.

---

## 2. HackIllinois 2026 Rules & Structure

### Tracks
- **Voyager (Hack Voyage):** $5K prize. Shark Tank style judging — presentation-heavy, favors polished demos. Requires passing a coding challenge during registration. Application-based entry.
- **General:** $2.5K prize. Expo/science-fair style — high volume, easy to get lost in noise. Open entry.
- **All team members must be in the same track.** If one person is General, the whole team is General.
- Auto-routed to General if coding challenge not passed.

### Sponsor Challenges
- Up to 5 sponsor challenge opt-ins per team, regardless of track.
- Track-agnostic — both Voyager and General can compete for all sponsor prizes.
- Target sponsor challenges: Supermemory, Cloudflare, OpenAI (+UI/UX if available).

### Prize Pool
- Total pool $60K+ (up from $5K in 2021).
- 1st place also gets $5K Modal credits/person + Modal office visit.
- The "$5K Credits" prize is for Modal, not Cloudflare.

### Judging
- The 3-min demo video is the MOST IMPORTANT deliverable — judges watch before reading code.
- Shark Tank format (Voyager) favors our demo-first strategy perfectly.
- Expo format (General) dilutes demo advantage — projects compete for attention against hundreds.

### Event Details
- Dates: Feb 27 – Mar 2, 2026 (36 hours of hacking)
- Event has grown from 177→353 participants and prizes from $5K→$75K+ between 2021-2026.
- Solo hackers CAN win — Joey Koh won 1st Place SharkTank solo.
- Teams limited to 1 track and 1 path.

---

## 3. Prism Architecture

### Core Flow
1. User query → `Promise.all` fan-out to 3-5 models via Vercel AI SDK `createProviderRegistry`
2. → Cloudflare AI Gateway (provider-specific URLs, NOT `/universal` fallback endpoint — `/universal` is for fallback, not simultaneous fan-out)
3. → Collect responses → compute JSD over n-gram frequency distributions + cosine similarity via edge embeddings
4. → Visualize agreement heatmap
5. → Extract atomic claims from most-divergent response → cross-check claims against consensus

### Stack
- Cloudflare Pages (React frontend)
- → Workers (API layer)
- → AI Gateway (multi-model proxy + analytics)
- → Workers AI (`bge-base-en-v1.5` for embeddings, 768d)
- → Vectorize (edge vector DB, sub-50ms RAG)
- → D1 (metadata via Drizzle, serverless SQLite)
- → R2 (raw response logs, S3-compatible, zero egress)

### Memory Layer
- Supermemory v3 Memory Router (baseURL swap to `api.supermemory.ai/v3/`) for fast integration
- Selective v4 calls: `POST /v4/search` with `rerank:true`, `POST /v4/profile` for user state
- Memory tracks user queries over time and builds a graph of how different topics and model disagreements connect

### Graph
- `@supermemory/memory-graph` with `highlightDocumentIds` driven by search results
- **CRITICAL GOTCHA:** v4 search returns memory record IDs, graph component uses document IDs — must map between them
- Graph visualizes query history and model divergence patterns over time — not just one-off comparison

### Visualization
- `shadcn/ui` (Recharts) for standard metrics — do NOT use raw D3 or WebGL
- `@nivo/heatmap` for divergence color scales (red = hallucination/disagreement, blue = consensus)
- `framer-motion` `<AnimatePresence mode="wait">` for smooth transitions between chart types

### Starter
- `cloudflare/agents-starter` (chat UI + ai-sdk)
- Also available: `cloudflare/workflows-starter` (durable execution)

### Token Normalization
- Normalize token counts across models by calculating Token Density or Bytes-per-Token
- Use Vercel AI SDK `createProviderRegistry` for multi-provider management

---

## 4. Supermemory API Surface (Complete)

### Memory Router (v3)
- Zero-code proxy — change `baseURL` to `api.supermemory.ai/v3/`
- Fastest integration path for hackathon timeline

### Vercel AI SDK Wrapper
- `withSupermemory` wrapper + `supermemoryTools` helpers:
  - `addMemories` — store new memories
  - `retrieveMemories` — search/retrieve memories
  - `getMemories` — list memories

### User Profiles (v4)
- `POST /v4/profile` with static + dynamic sections
- `client.profile({containerTag, q})` combines profile + search in one call
- Profile response: `{static: string[], dynamic: string[]}`
- Can dynamically alter UX based on user profile

### Graph Memory React Component
- Package: `@supermemory/memory-graph`
- Props:
  - `documents` (DocumentWithMemories[])
  - `highlightDocumentIds` (string[] — accepts both customId and internal id)
  - `highlightsVisible` (boolean)
  - `variant` ('console' | 'consumer')
  - Pagination: `isLoadingMore`, `hasMore`, `loadMoreDocuments`, `autoLoadOnViewport`
- MemoryEntry interface: `{id, documentId, content, summary, title, type, metadata, createdAt, updatedAt, spaceContainerTag, relation ('updates'|'extends'|'derives'), isLatest, spaceId}`
- Exports: MemoryGraph, GraphCanvas, Legend, LoadingIndicator, NodeDetailPanel, SpacesDropdown
- Hooks: useGraphData, useGraphInteractions
- Best demo pattern: fetch `/api/search`, extract `r.documentId` from results, pass as `highlightDocumentIds` prop

### Search (v4)
- `POST /v4/search`
- Params: `q` (required), `containerTag`, `searchMode` ('hybrid' | 'memories'), `limit`, `threshold` (0-1), `rerank` (boolean, adds ~100ms), `filters` (AND/OR)
- Filter types: string_equal, string_contains, numeric, array_contains, negate
- Filtering: containerTags (v3 array) vs containerTag (v4 string)

### Memory Operations (v4)
- POST create memories directly (bypass ingestion)
- PATCH update (versioned)
- POST forget
- Relations: 'updates' (info changes), 'extends' (info enriches), 'derives' (info infers)
- Automatic forgetting for time-bound memories

### Memory vs RAG Conceptual Distinction
- RAG = stateless semantic similarity (Query→Embedding→Vector Search→Top-K→LLM)
- Memory = contextual graph (Query→Entity Recognition→Graph Traversal→Temporal Filtering→Context Assembly→LLM)
- Use RAG for knowledge base queries, Memory for user-specific recall
- Supermemory handles both via hybrid retrieval with container_tags for user isolation
- LongMemEval benchmark: Supermemory scores 81.6% vs 40-60% for standard RAG

### Pricing / Access
- $1K credits via Startup Program
- Form booking use-case: "Agent memory" (not Enterprise RAG — triggers paid-tier routing)

### ID Space Gotcha (CRITICAL)
- v4 Search returns **memory record IDs**
- v3 List/Export and the Graph component use **document IDs**
- Must map between them — this is the #1 technical risk
- `v3/documents/search` endpoint takes `docId` for within-document search

---

## 5. Cloudflare Hackathon Architecture

- **AI Gateway**: Proxy + analytics for multi-model routing. Provider-specific URLs for fan-out. `/universal` is for fallback only, NOT for simultaneous fan-out.
- **Workers AI**: Llama 3 + BGE embeddings 768d on edge
- **Vectorize**: Edge vector DB, sub-50ms RAG
- **D1**: Serverless SQLite for metadata
- **R2**: S3-compatible, zero egress for logs
- **Pages**: Frontend + SSR
- **Starter kits**: `cloudflare/agents-starter` (chat UI + ai-sdk), `cloudflare/workflows-starter` (durable execution)
- **Optimal stack**: Pages(React) → Workers(API) → AI Gateway(multi-model) → Vectorize+Workers AI(embeddings) → D1(metadata) → R2(archives)

---

## 6. Hallucination Detection Methodology

### Atomic Fact Extraction
- LLM decomposes paragraphs into decontextualized claims (individual verifiable statements)
- Each claim scored independently against other model responses

### Scoring Methods
- **Vectara HHEM** (Hallucination Evaluation Model): Open-source cross-encoder, HHEM-2.1-Open
- **DeepEval**: LLM-as-a-judge approach
- Used on the most-divergent response to cross-check claims against consensus from other models

---

## 7. Statistical Divergence Methods

### Jensen-Shannon Divergence (JSD)
- Computed over n-gram frequency distributions of model responses
- Symmetric divergence measure (unlike KL divergence)
- ~20 lines of math to implement

### Cosine Similarity
- Via edge embeddings from Workers AI (`bge-base-en-v1.5`)
- Measures semantic similarity between response pairs

### Token Normalization
- Token Density or Bytes-per-Token to compare across models with different tokenizers
- Necessary because different models tokenize differently

---

## 8. Competitive Landscape

- **Multi-model comparison (Prism space)**: Consumer chat hubs (AiZolo, Poe) and enterprise LLMOps (Langfuse, Braintrust) are saturated, but STATISTICAL DIVERGENCE analysis is untouched. **ZERO hackathon winners in this space 2024-2026.**
- **Conversation analysis (Spectral space)**: Backend observability (LangSmith, Langfuse) saturated but "game tape replay" UX is massive white space. ZERO hackathon projects with replay+overlay concept.
- **Knowledge graph**: Neural City (Berkeley) and Graph Query (MLH) already won recently — Engram deprioritized.

---

## 9. Expert Evaluation Results

- **Oracle recommends Prism** as #1: highest prize stacking (OpenAI+Cloudflare+SM+UI/UX), best feasibility for parallel agents, clearest demo narrative.
- **Momus recommends Spectral** as #1: demo-first architecture, visceral pain point ("when is AI lying?"), lowest floor (even bad version looks decent).
- **Both agree to KILL**: Tempo, Seismograph, Canary, Palimpsest, Loom.
- **Engram divisive**: Oracle likes for SM fit, Momus calls it a graph viz time trap.

### Rejected Ideas & Reasons
- **Engram**: Done before; graph viz time trap per Momus.
- **Drift**: Unsolved research problem.
- **Echo**: Duplicates existing Supermemory product.
- **Aperture**: API cost/latency too high.
- **Tempo, Seismograph, Canary, Palimpsest, Loom**: Both Oracle and Momus agreed to kill.

---

## 10. Supermemory Founder Meeting Prep

**Dhravya Shah**: 20yo solo founder from Mumbai, $40M valuation, $3M seed (Susa Ventures, Browder Capital, SF1.vc). Backers: Jeff Dean (Google AI), Dane Knecht (Cloudflare CTO), Logan Kilpatrick (DeepMind). Previously sold Twitter bot to Hypefury. Dropped out of ASU. Quote: "I still would like a co-founder." Philosophy: "Intelligence without memory is just randomness."

**Meeting**: Booked Thu Feb 26, 2:30–3:00 PM CT via Cal.com (Google Meet)

**Form filled**:
- Use-case: "Agent memory"
- Company size: 1
- Solo framing mandatory ("I" not "we")
- Additional notes referenced v3/v4 API path, graph component IDs, search reranking latency, demo reliability

**Additional Notes submitted:**
> I'm a solo developer competing at HackIllinois this weekend, building a multi-model divergence analyzer where memory is core product behavior, not just retrieval.
>
> I'm integrating Supermemory for persistent user/query state and graph-based interaction history, including `@supermemory/memory-graph` with `highlightDocumentIds` to visualize which memory clusters are active during model disagreement analysis.
>
> I'd like this call to validate implementation details before judging:
> 1) best path for my build timeline (v3 Memory Router vs direct v4 endpoints),
> 2) correct ID mapping for graph highlighting and memory ops,
> 3) expected latency/rate-limit behavior for `v4/search` with rerank enabled,
> 4) reliability/fallback recommendations for a live 3-minute demo,
> 5) what distinguishes a winning Supermemory sponsor submission from a basic integration.
>
> I'm optimizing for a polished, technically accurate demo and would value direct guidance on pitfalls to avoid.

**30-Minute Agenda:**
1. Winning criteria — "What separates top sponsor submissions from basic API usage?" (5 min)
2. v3 Router vs v4 direct architecture decision (8 min)
3. Graph/ID mapping correctness (7 min)
4. Rate limits + p95 latency for rerank (6 min)
5. Reliability + escalation path during judging (4 min)

**Key Questions:**
- `withSupermemory` vs v3 proxy for metadata control
- Static vs dynamic profile conflict resolution
- Max node/edge count for smooth graph rendering

**20-second opener:**
"I'm building a solo HackIllinois project where Supermemory is central to the product UX. I want to make sure we implement the right APIs and highlight the platform in a way that aligns with what your team values most for the sponsor challenge."

**Anticipated concerns to preempt:**
- Solo hacker completion → mitigate by scoping ruthlessly
- RAG wrapper accusation → mitigate by showing memory IS the navigation
- Prize farming → mitigate by showing CF+SM synergy

---

## 11. Ryan Ni Team Intel

- **Ryan Ni** (ryunzz.tech): 13 hackathon wins, incoming OpenAI, won OpenAI Codex Hackathon at OpenAI HQ ($10K) with "Yolodex" (end-to-end game vision pipeline using Codex agents for YOLO dataset labeling). Sam Altman personally interacted. Previously at Apple.
- **Sectonic**: Previous/incoming Apple + current Phia.
- Team of 3 in HackVoyagers track, seeking 4th. Looking for "fun ideas."
- DM sent via Instagram with Prism pitch + Red Bull Tetris World Finals credentials.

**DM sent:**

> Hey — saw your post in the HackIllinois Discord. Congrats on the Codex win, Yolodex looked clean.
>
> I'm a CS student at UIUC. Some relevant stuff: I was the main developer for the version of Red Bull Tetris used in the Red Bull Tetris World Finals, and won Developer of the Year for that work. My focus now is AI agent orchestration and memory systems — deep integration with Supermemory's API (graph memory, user profiles, search reranking) and Cloudflare's edge AI stack, plus strong React for frontend.
>
> I already have a researched project concept that stacks across OpenAI, Cloudflare, and Supermemory sponsor challenges — multi-model divergence analysis with a persistent memory layer and real-time statistical visualizations. Happy to pitch it or adapt to whatever direction the team is leaning.
>
> Let me know if you're still looking for a 4th.

**Strategic assessment of joining:**
- Pros: 13-win track record + OpenAI connections = judge credibility halo. They have web/mobile/AI/ML/IoT — user adds agent orchestration + Supermemory/memory systems. Team of 4 in Voyage > solo for demo polish and scope.
- Risks: Idea negotiation (they may have own direction). Lose full creative control over demo narrative. Track-lock if anyone isn't Voyage.

---

## 12. Belle Outreach

- **Belle**: Math+Arts UIUC freshman. Contacted for design/UI help.
- Likely in General track — not viable for Voyage team (all members must be same track).
- Could still provide informal design feedback without being on team.
- Message exchange: Sent explanation of Prism concept. She responded asking about specific behaviors/comparisons and what story the visualization should tell. Follow-up explanation sent covering consensus vs divergence heatmaps, atomic claim checking, and memory graph over time.

**Message sent to Belle explaining the project:**

> Hey! So the idea is — you send the same question to multiple AI models simultaneously and compare how they respond. The interesting part is where they disagree. If 4 models agree on something but one gives a different answer, that's worth flagging.
>
> We want to visualize that as something like a heatmap showing consensus vs divergence across models, and then do deeper analysis on the outlier responses — breaking them into individual claims and checking which ones hold up.
>
> There's also a memory layer to it. The app tracks your queries over time and builds a graph of how different topics and model disagreements connect — so you're not just getting a one-off comparison, you're building up a picture of where AI models tend to be reliable vs where they consistently split.
>
> On the visual side we're thinking interactive heatmaps, side-by-side response panels, and that query/knowledge graph. Lots of room for strong data visualization and making it feel intuitive rather than just dumping text.
>
> Curious what you think, especially from the design angle — the visualization is a big part of what makes the demo work.

---

## 13. Competitive Edge (Personal Stack)

User's proprietary AI agent/plugin stack is an unfair advantage that 99% of hackathon attendees cannot replicate:
- Antigravity proxy (multi-provider routing)
- Cliproxy (OpenAI-protocol)
- OpenCode with oh-my-opencode (background agents, LSP, AST-Grep, categories)
- Supermemory plugin (persistent memory)
- Gladforge (JJ VCS, PTY, Cloud, DCP)
- Tailscale mesh networking
- GCE VM with 30 CPU cores + 57GB RAM

Strategy: Need either (A) insanely advanced technical breakthrough that's understandable and impressive, OR (B) locked-in frontend scene with solid backend. Focus on what's unique but not limited to it. Not doing hardware track — no physical hardware interactions.

---

## 14. HackIllinois Winning Patterns (2021-2025)

Four archetypes win consistently:
- **(A) Developer Productivity Tools** — board2ticket, Lumberjack, BlackBox Studio
- **(B) Gamified Utility** — GitPets, bons.ai
- **(C) Hardware/AgTech** — HarvestHero, autonomous vehicles
- **(D) Niche Sponsor Hacks** — TerraQuestt, PixSol on Solana

The 3-min demo video is the most important deliverable — judges watch before reading code. Common failure mode is unfinished backend; winners scope ruthlessly for 36hrs and fake non-critical paths. Solo hackers CAN win — Joey Koh won 1st Place SharkTank solo.

---

## 15. Supermemory Memory IDs (for reference)

| Memory ID | Topic |
|---|---|
| `mXjnGwmVrv75Goddj5NhBb` | Competitive edge analysis |
| `tupVCrNgC1aMJFNyqs8piE` | Ryan Ni team intel |
| `UKgtddX4JNH95cSqALCC2h` | Founder meeting prep |
| `dNTo2vjmHQ4pjebvbZ2D7F` | Competitive landscape |
| `sTaZ8S1Qcz8SHF8sxw32n1` | Cloudflare hackathon architecture |
| `wJZtDnAxfkiHftJStv6Yjn` | Supermemory API hackathon integration |
| `B3nu5ta6UuQh3iTDRtUHRL` | Expert evaluation results |
| `wQhJvjvynEyC6NQs3sc4DF` | Session state (if still exists) |

---

## Pending Next Steps

1. Founder meeting debrief — capture any new API guidance or strategy pivots
2. Implementation playbook — step-by-step build plan with hour-by-hour allocation for 36h
3. Codebase scaffold — `cloudflare/agents-starter` + Vercel AI SDK + wrangler.toml bindings
4. Demo storyboard — exact 3-minute walkthrough script for Shark Tank presentation
5. Sponsor challenge submissions — map each feature to Supermemory/Cloudflare/OpenAI criteria
