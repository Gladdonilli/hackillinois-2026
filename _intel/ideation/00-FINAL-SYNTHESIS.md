# HackIllinois 2026 — Final Ideation Synthesis

**Generated:** 2026-02-28
**Agents:** 10 of 12 completed (2 Oracles timed out after 15+ min deep thinking)
**Total concepts evaluated:** ~60 unique ideas across Artistry (×2), Deep (×2), Explore (×2), Librarian (×2), Ultrabrain (×2)

---

## TOP 6 — RANKED

### 🥇 1. LARYNX (Deepfake Voice Forensics via Articulatory Inversion)

**Surfaced by:** Artistry-1, Ultrabrain-2 (#1 pick), Explore-2, Librarian-2, Deep-2 (as VoxGuard API)

**Core flow:** Audio → Mel spectrogram → AAI model on Modal A100 → EMA tongue/jaw coordinates → kinematic velocity check → 3D rigged head visualization

**The demo moment:** Real voice = smooth green ribbons (12-16 cm/s). Deepfake = tongue at 80-200 cm/s, CLIPS THROUGH NASAL CAVITY AND SKULL. White-hot velocity ribbons, chromatic aberration + screen shake. The tongue literally phases through the brain.

| Metric | Score |
|--------|-------|
| Feasibility | 7.5/10 |
| Demo Wow | 10/10 |
| Track Fit | Stripe ✅ (WIDE OPEN, 1 competitor) |
| Sponsors | 4/4 (Modal inference, CF API/Workers, OpenAI reasoning evaluator, Supermemory voice profiles) |
| Solo-able | ✅ (~20h build) |
| Grand Prize | STRONG |

**Stack:** Modal (AAI model) + R3F + GSAP SplitText + postprocessing bloom/chromatic + Lenis + Motion

**Fatal flaw:** "2 billion deepfake products" — framing risk
**Mitigation:** Frame as FORENSIC PHYSICS ENGINE, not "deepfake detector." The product is the impossible throat — nobody else shows WHY it's fake at the anatomical level.

**Winning pattern match:** ✅ Physics moat, ✅ High-stakes narrative, ✅ Perception > generation, ✅ 3D command center UI

---

### 🥈 2. SYNAPSE (Live Neural Surgery — SAE Feature Ablation)

**Surfaced by:** Ultrabrain-2 (#2 pick), Deep-1 (as Geodesic variant), Artistry-1 (as MorphoCode variant)

**Core flow:** 3D brain of 5K SAE feature nodes (UMAP layout). Type prompt → pathways fire golden. Find "sycophancy" feature → zoom into cluster → drag ablation slider → nodes die with particle bursts + DrawSVG connection severing → model regenerates honest response live.

| Metric | Score |
|--------|-------|
| Feasibility | 8/10 |
| Demo Wow | 9/10 |
| Track Fit | Stripe ✅ (as API: POST /v1/interventions) |
| Sponsors | 4/4 (Modal GPU, CF edge API, OpenAI comparison, Supermemory feature memory) |
| Solo-able | ✅ (~20h build) |
| Grand Prize | STRONG |

**Stack:** Modal (TransformerLens + andyrdt/saes-llama-3.1-8b-instruct + ActAdd 30 lines) + R3F + d3-force-3d + GSAP DrawSVG + Motion

**Fatal flaw:** Modal track = BLOODBATH (7+ competitors). Must pivot to Stripe track as API.
**Mitigation:** Expose as Stripe-quality API with idempotency, test mode, webhooks. Nobody else lets you EDIT the model's brain through an API.

---

### 🥉 3. VORTEX (Neural Fluid Sculptor — Differentiable CFD)

**Surfaced by:** Ultrabrain-2, Deep-1 (as EchoMesh variant), Artistry-2 (as Reynolds Factor)

**Core flow:** Draw 2D shape → FNO/LBM solves Navier-Stokes on A100 → 50K WebGL particles show airflow in real-time. Slider: Reynolds 1.2K→120K. Laminar→turbulent transition. Von Kármán vortex streets. Compare drag vs Tesla.

| Metric | Score |
|--------|-------|
| Feasibility | 6/10 |
| Demo Wow | 9/10 |
| Track Fit | Modal ⚠️ (bloodbath) or Caterpillar (wind analysis) |
| Sponsors | 3/4 |
| Solo-able | ✅ (~20h) |
| Grand Prize | MEDIUM |

**Fatal flaw:** FNO pre-trained weights may not exist for general aerodynamics. LBM fallback is less impressive.

---

### 4. BASILISK (Adversarial Vision Revealer)

**Surfaced by:** Ultrabrain-2, Deep-1 (Manifold Sentinel lineage)

**Core flow:** Upload panda (99% confident) → FGSM attack (97% gibbon) → perturbation as 3D displacement map (image physically boils) → 100 CMA-ES agents evolve counter-perturbation → image heals. GradCAM drives displacement.

| Metric | Score |
|--------|-------|
| Feasibility | 7/10 |
| Demo Wow | 8/10 |
| Track Fit | Modal ⚠️ |
| Sponsors | 3/4 |
| Solo-able | ✅ |
| Grand Prize | MEDIUM |

**Fatal flaw:** Adversarial examples are well-studied. "Cool visualization of known phenomenon."

---

### 5. PHANTOM (Gesture-Forged Interface)

**Surfaced by:** Ultrabrain-2 (#3 pick), Artistry-1

**Core flow:** MediaPipe hands → 21 landmarks → particle trails. Pinch = spawn node. Two-hand pull = connect. Spread = Fibonacci spiral sub-tasks. Fist+twist = 3D rotate. Clap = collapse all. No mouse.

| Metric | Score |
|--------|-------|
| Feasibility | 7/10 |
| Demo Wow | 8/10 |
| Track Fit | None strong |
| Sponsors | 2/4 |
| Solo-able | ✅ |
| Grand Prize | LOW |

**Fatal flaw:** Conference lighting kills gesture recognition. Demo failure risk HIGH. Also "gesture UI" echo of Leap Motion era.

---

### 6. CONDUCTOR (Orchestral Debugger)

**Surfaced by:** Ultrabrain-2, Artistry-2 (as Polyphony.sh), Deep-1

**Core flow:** Multi-agent system as music DAW. Agents = instrument tracks. API calls = notes. Errors = dissonance. Drag agents to reorder → music becomes harmonious. Web Audio API sonification.

| Metric | Score |
|--------|-------|
| Feasibility | 8/10 |
| Demo Wow | 7/10 |
| Track Fit | CF Agents SDK |
| Sponsors | 3/4 |
| Solo-able | ✅ |
| Grand Prize | LOW |

**Fatal flaw:** Music + code is gimmicky. Judges ask "who would actually use this?"

---

## STRATEGIC ASSESSMENT

| Concept | Feasibility | Demo Wow | Track Fit | Sponsors | Solo | Grand Prize? |
|---------|-------------|----------|-----------|----------|------|-------------|
| LARYNX | 7.5/10 | 10/10 | Stripe ✅ | 4/4 | ✅ | Strong |
| SYNAPSE | 8/10 | 9/10 | Stripe ✅ | 4/4 | ✅ | Strong |
| VORTEX | 6/10 | 9/10 | Modal ⚠️ | 3/4 | ✅ | Medium |
| BASILISK | 7/10 | 8/10 | Modal ⚠️ | 3/4 | ✅ | Medium |
| PHANTOM | 7/10 | 8/10 | None | 2/4 | ✅ | Low |
| CONDUCTOR | 8/10 | 7/10 | CF | 3/4 | ✅ | Low |

## KEY FINDINGS FROM AGENTS

### From Librarian-2 (Winner Patterns):
- Solo grand prize winners are "virtually non-existent" — teams of 4-6 dominate
- Winners have HIGH-FRICTION MOAT (physics, custom compute, hardware)
- ~55% pure software winners had mathematically heavy cores
- LARYNX matches ALL 4 winning patterns

### From Explore-1 (Missed Angles):
- Stripe track is LEAST contested (1 competitor vs 7+ in Modal)
- Risk/compliance, IAM/security, audio tech have judge representation but ZERO competitor projects
- API-first trust/compliance in Stripe lane + one hard technical moat = optimal strategy

### From Explore-2 (Competitor Gaps):
- Zero-competition domains: audio deepfake forensic physics, physics-first AI sim, WebGPU-native compute
- Absent approaches: custom CUDA, physics sim as primary engine, articulatory inversion
- Strategic recommendation: audio authenticity physics engine avoids ALL crowded lanes

### From Ultrabrain-1 (Feasibility):
- Best combos: Cat 3+7 (activation extraction + 3D viz) or Cat 5+7 (audio + 3D)
- Modal A100 cold start 5-10s (keep_warm=1), SSE > WebSocket for Modal
- InstancedMesh handles 100K+ objects at 60fps, GPU particles via THREE.Points = 1M+ at 60fps

### From Librarian-1 (Emerging Tech):
- WebGPU + Transformers.js v3 can run 7-9B models fully in-browser (bold demo trick: disconnect WiFi)
- Cloudflare Agents SDK v0.3.0 — stateful edge agents with 1GB embedded SQLite per agent

### From Ultrabrain-2 (Visual Spectacle):
- Shared animation stack ~155kb total (Motion + GSAP + Lenis + Sonner + NumberFlow + R3F)
- Demo trick for LARYNX: multiply kinematic error by 5x for maximum visual impact
- LARYNX #1, SYNAPSE #2, PHANTOM #3

---

## RECOMMENDATION

**LARYNX or SYNAPSE.** Both are grand-prize-caliber in Stripe track. Pick based on:

- **LARYNX** if you want the most VISCERAL demo (tongue through skull = instant brain short-circuit)
- **SYNAPSE** if you want the CLEANEST build path (pre-trained SAEs exist, ActAdd = 30 lines, 8/10 feasibility)

Both can be built in ~20h solo with the validated animation stack.

---

## PENDING: Oracle Outputs

Two Oracle agents (adversarial evaluation + 5-judge persona simulation) were still in deep thinking after 15+ minutes. If their files land in `_intel/ideation/oracle-*.md`, they'll contain adversarial critique and judge-by-judge scoring that may shift rankings.
