# LARYNX — Deep Analysis Prompt

You are a senior systems architect and hackathon strategist. We're a 4-person team building LARYNX for HackIllinois 2026 over the course of a week. I need you to think deeply about the ideal architecture, algorithmic pipeline, API design, frontend visualization, and build plan.

## CONCEPT

LARYNX is a deepfake voice forensics engine that proves a voice is fake by showing WHY it's physically impossible — the vocal tract required to produce it can't exist in a human body.

**Core flow:** Audio → Mel spectrogram → Articulatory Inversion (AAI) model on Modal A100 → EMA (electromagnetic articulography) tongue/jaw/lip coordinates → kinematic velocity/acceleration check → 3D rigged vocal tract visualization

**The demo moment:** Real voice = smooth green motion ribbons showing tongue at 12-16 cm/s. Deepfake audio = tongue at 80-200 cm/s, CLIPS THROUGH THE NASAL CAVITY AND SKULL. White-hot velocity ribbons, chromatic aberration + screen shake. The tongue literally phases through the brain. Judges' brains short-circuit.

**Academic basis:** USENIX Security 2022 "Who Are You?" (Logan Blue et al.) — articulatory inversion for speaker verification. Human tongue max velocity ~15-20 cm/s. Deepfake synthesizers don't model articulatory physics, so inverse-mapped coordinates require physically impossible movements.

## RESOURCES

- **Modal:** $250 GPU credits (A100 ~$4.17/hr = ~60h). Cold start 5-10s (use keep_warm=1). MUST use HuggingFace transformers (not vLLM — fused CUDA kernels block Python hooks).
- **Cloudflare:** Workers, Pages, AI Gateway, D1 (SQLite), R2 (object storage), Vectorize (10M vectors), Workers AI (Llama 3.1 8B/70B, DeepSeek-R1-Distill), Agents SDK (stateful Durable Objects), Workflows (durable execution). Target: 5+ CF products for sponsor challenge.
- **OpenAI:** Free via Cliproxy proxy during dev. o3-mini for reasoning evaluation. Structured Outputs (strict JSON schema) for claim extraction.
- **Supermemory:** POST /add, POST /search (returns context.parent[]/child[] = graph edges), POST /profile. @supermemory/memory-graph renders D3 node-link visualization. Rate limit: sequential 1s sleep.
- **VM:** 30-core GCE, 57GB RAM, Ubuntu 24.04

## TRACK & SPONSORS

- **Track: Modal** (Best AI Inference) — "best project that hosts model inference on Modal." Judges evaluate: technical depth of GPU utilization, model quality, inference optimization. 3 Modal judges including David Wang (LLM inference optimization expert). Competitive field (7+ serious competitors including Aryan 3x winner doing CV, Bowen's team) but this project naturally fits — every hour building the core product directly satisfies track requirements.
- **Sponsor fit (4/4):** Modal (AAI inference on A100), Cloudflare (API gateway + edge workers + D1 + R2), OpenAI (reasoning evaluator for forensic reports), Supermemory (voice analysis history + knowledge graph of analyzed samples)
- **Prize ceiling:** Voyager $5K + Modal track + up to 3 sponsor challenges + up to 2 categories (UI/UX, Most Creative) = potentially $15K+

## TECHNICAL DETAILS (from feasibility analysis)

### AAI Model Options
- Pre-trained AAI models exist in speech research (MNGU0 corpus, Haskins datasets)
- Architecture: Bi-LSTM or Transformer encoder, input = Mel spectrogram frames, output = 6-12 EMA channel coordinates (tongue tip, tongue body, tongue dorsum, jaw, upper lip, lower lip)
- Training from scratch on EMA corpus is possible in ~2h on A100 if pre-trained weights unavailable
- Alternative: Use a simpler Gaussian Mixture Model (GMM) based AAI as fallback

### Kinematic Physics Check
- Human tongue: max velocity ~15-20 cm/s, max acceleration ~150 cm/s²
- Deepfake audio: inverse-mapped tongue velocity typically 80-200+ cm/s (physically impossible)
- Detection: simple threshold on velocity magnitude + acceleration magnitude
- Per-frame velocity = finite difference of EMA coordinates × sampling rate
- Confidence score = max(velocity) / human_max_velocity (>1.0 = impossible = fake)

### 3D Visualization Stack
- React Three Fiber (R3F) + drei helpers + postprocessing (bloom, chromatic aberration)
- Rigged GLTF head model with morph targets for jaw/lip/tongue
- EMA coordinates drive morph target weights in real-time
- Velocity magnitude drives: ribbon color (green→yellow→red→white), ribbon thickness, bloom intensity, chromatic aberration strength, screen shake amplitude
- At velocity > 4x human max: tongue mesh clips through nasal cavity geometry (the "oh shit" moment)
- InstancedMesh handles 100K+ objects at 60fps, GPU particles via THREE.Points = 1M+ at 60fps

### API Design
```
POST /api/verify
  - Input: audio file (wav/mp3, max 30s)
  - Returns: { verdict, confidence, kinematic_data, ema_trajectory }

GET /api/verify/:id
  - Returns: full analysis with EMA coordinates for 3D replay
```
- CF Workers API.

### Animation Stack (validated, ~155kb total)
- Motion (framer-motion rebrand, ~15kb) — UI transitions, AnimatePresence, layoutId morphs
- GSAP 3.14 + ScrollTrigger + SplitText (ALL FREE after Webflow acquisition) — kinetic typography, scroll-driven narrative, DrawSVG for connection severing
- Lenis (~3kb) — smooth scroll
- NumberFlow — animated velocity counters
- R3F + drei + postprocessing (~100kb) — 3D vocal tract, bloom, chromatic aberration
- Magic UI / Aceternity UI — copy-paste premium components (hero sections, backgrounds, cards)

### Winning Patterns (from research)
- Grand prize winners have HIGH-FRICTION MOAT — judges think "I have no idea how they built that"
- Demo anatomy: Hook (0-30s) → "Oh Shit" moment (30-90s) → Under the Hood (90-150s) → Impact (150-180s)
- Winners use pre-built UI (shadcn/ui, Aceternity, MagicUI) — building from scratch is anti-pattern

### 57 Judges — Key Archetypes
- ~20 systems engineers, ~15 AI/ML experts, ~8 product/PM, ~8 full-stack/frontend, ~6 security
- Key: Aydan Pirani (OpenAI, former HackIllinois Co-Director, CUDA), Vasu Jain (Amazon, anti-wrapper zealot), Karthik Kadapa (AI Product Exec 12yr), David Wang (Modal, LLM inference opt)
- Anti-wrapper is THE dominant theme. JSD+physics = the depth that wins.

## WHAT I NEED FROM YOU

Think deeply and provide:

1. **Application Architecture:** Full system diagram — what runs where (Modal, CF Workers, CF Pages, D1, R2, etc.), data flow from audio upload to 3D visualization, WebSocket/SSE streaming architecture for real-time EMA coordinate delivery.

2. **Algorithmic Pipeline:** Exact step-by-step from raw audio to verdict. Which AAI model/weights to use (or train). Mel spectrogram parameters. EMA coordinate extraction. Kinematic velocity computation. Detection threshold calibration. How to handle edge cases (noise, short clips, non-speech audio).

3. **API Design:** Clean endpoints with proper error handling and response schemas.

4. **Frontend Architecture:** Component tree, state management, animation sequences. The 3D vocal tract scene graph. How EMA data streams into R3F. The "velocity escalation" visual sequence. Landing page scroll narrative.

5. **Build Plan:** What to build first, what to parallelize, dependency graph between components. Risk mitigation for each phase. Fallback strategies if AAI model doesn't work.

6. **Demo Script:** Exact 3-minute Voyager pitch script. What to show, when. The hook, the oh-shit moment, the technical depth reveal, the impact close.

7. **Sponsor Integration Checklist:** How to maximally satisfy each of the 4 sponsors' judging criteria.

Every architectural decision should optimize for "looks incredible in 3 minutes on stage" while being technically deep enough that judges can tell it's real engineering, not a wrapper.
