# SYNAPSE Frontend — What's NOT Done

Everything below must be resolved or implemented before the frontend is buildable. The architecture, component tree, API contracts, and animation choreography are fully spec'd — this file tracks **only** what's missing.

---

## Unresolved Design Decisions

These need a decision before implementation can start. Recommendations included.

### 1. UMAP Coordinate Strategy
**Conflict:** ARCHITECTURE.md says UMAP on co-activation matrix (runtime, per-prompt). Artistry analysis says UMAP on SAE decoder weights (pre-computed once, stored in CF R2).

**Recommendation:** Pre-computed on decoder weights. Eliminates runtime UMAP cost (~200ms), gives fixed spatial layout judges can learn across prompts. Live UI only updates brightness/size/emissive from `feature_acts`.

**Impact:** Changes `POST /api/features/{job_id}` response — `umap_xyz` becomes a static lookup table loaded at app init, not returned per-request.

### 2. Ablation Slider Semantics
**Conflict:** ARCHITECTURE.md defines `AblationSlider (0.0-1.0, default 1.0)` where 0.0 = fully ablated. Artistry analysis recommends negative clamping to -10 for stronger effect.

**Recommendation:** Both. UI shows intuitive 0.0–1.0 slider. Backend maps: `1.0 → no change`, `0.5 → clamp at -5`, `0.0 → clamp at -10`. The mapping formula: `clamp_value = (1.0 - slider_value) * -10`.

**Impact:** Frontend sends 0.0-1.0, backend interprets. No frontend complexity added.

### 3. CSS Framework
**Not in current SYNAPSE stack.** `package.json` has no Tailwind.

**Recommendation:** Add Tailwind CSS. Every pre-built component library in the animation research (Magic UI, Aceternity, Motion Primitives, Ibelick UI) requires it. The `cn()` utility (`clsx` + `tailwind-merge`) is a prerequisite for all of them.

**Add to package.json:**
```json
"tailwindcss": "^3.4.16",
"postcss": "^8.4.49",
"autoprefixer": "^10.4.20",
"clsx": "^2.1.1",
"tailwind-merge": "^2.6.0"
```

### 4. Component Library
**Not in current SYNAPSE stack.**

**Recommendation:** shadcn/ui. Gives PromptConsole (TextArea, Slider, Button), InterventionPanel (Slider, Button), FeatureInspector (Tooltip/Popover), LayerNavigator (Slider) essentially for free. Dark mode built-in. Copy-paste model = no dependency lock-in.

**Init command:** `npx shadcn-ui@latest init` then `npx shadcn-ui@latest add button slider textarea tooltip popover`

### 5. Layout Architecture
**Not explicitly spec'd** — component tree defines components but not their spatial arrangement.

**Recommendation:** Single page, three-column desktop layout:
- **Left column** (~300px): PromptConsole + InterventionPanel (stacked)
- **Center** (flex-grow): BrainView (R3F Canvas, full-height)
- **Right column** (~400px): ResponseComparator + FeatureJournal (stacked)

LayerNavigator: horizontal strip below BrainView or integrated into left panel.
FeatureInspector: floating tooltip in 3D space (drei `<Html>` component).

On first generate, GSAP camera transition from flat 2D overview to dramatic 3D perspective (per artistry analysis).

### 6. Feature Label Source
**Options:** o3-mini live labeling (artistry analysis) vs top-token proxy (ARCHITECTURE.md) vs pre-computed for demo prompts.

**Recommendation:** Top-token proxy labels (already in Feature interface: `top_tokens: string[]`) with manually curated labels for the 5 demo prompts. o3-mini is a nice-to-have that adds 1-3s latency and rate limit risk. Not worth the complexity for a 3-minute demo.

---

## Missing Design Specs

These areas have **no documentation** — they need design before implementation.

### 7. Cold State / Landing Page
**Gap:** What does the user see before typing a prompt? The app starts with no features loaded, no brain rendered.

**Options:**
- A. Empty dark canvas with floating ambient particles + "Type a prompt to begin" ghost text
- B. Rotating pre-computed brain from a default prompt (costs 1 Modal warm-up call at page load)
- C. Hero landing page with project pitch, "Enter" button transitions to app
- D. Immediate app UI with empty panels, brain area shows stylized neural network animation (CSS/SVG, no data)

### 8. Loading States (4-6s Generation)
**Gap:** Generation takes 4-6s on warm A100. Feature extraction adds ~300ms. What does the user see?

**Needs design for:**
- PromptConsole: disable input, show spinner/progress?
- BrainView: loading animation? Particle swirl? Text like "Generating..."?
- StatusIndicator component exists in tree but behavior not spec'd
- SSE progress events defined in api-common.md but frontend handling not designed

### 9. Color Palette / Design Tokens
**Gap:** "Dark mode" mentioned everywhere but no actual colors specified.

**Needs:**
- Background color(s) — pure black (#000) vs dark gray (#0a0a0a) vs blue-black (#0a0f1a)
- Node colors: blue→white→gold gradient is defined in NeuronGraph code (HSL-based) but panel/UI colors are not
- Accent color for interactive elements
- Text colors (primary, secondary, muted)
- Error/success/warning colors
- Surface colors for panels (glass morphism? solid? border?)
- Whether to use SYNAPSE-specific branding vs generic dark theme

### 10. Typography
**Gap:** "Terminal font" mentioned in artistry analysis for PromptConsole but nothing else specified.

**Needs:**
- Primary font for UI text
- Monospace font for code/data displays (PromptConsole, FeatureInspector, response text)
- Font sizes for headings, body, labels, data values
- Whether to use a system font stack or import a custom font (JetBrains Mono, Fira Code, Inter, etc.)

### 11. Responsive Layout
**Gap:** All specs assume desktop/projector. Hackathon demo is on a laptop plugged into a projector.

**Decision needed:** Skip mobile entirely? Min-width: 1280px? The 3D brain needs significant viewport space to be impressive.

**Recommendation:** Desktop-only. Min-width 1280px. Add a "Best viewed on desktop" message for smaller screens. Don't waste time on responsive.

---

## Missing Implementation (Zero Source Code)

Every file listed in STACK.md `File Structure` needs to be created from scratch:

### Core Files (Critical Path)
- [ ] `frontend/src/main.tsx` — App entry point
- [ ] `frontend/src/App.tsx` — Root component with layout
- [ ] `frontend/src/store/useSynapseStore.ts` — Zustand store
- [ ] `frontend/src/types/synapse.ts` — TypeScript interfaces (spec'd in ARCHITECTURE.md)
- [ ] `frontend/src/components/BrainView.tsx` — R3F Canvas wrapper
- [ ] `frontend/src/components/NeuronGraph.tsx` — InstancedMesh (code exists in ARCHITECTURE.md)
- [ ] `frontend/src/components/PromptConsole.tsx` — Prompt input + controls

### Secondary Components
- [ ] `frontend/src/components/ActivationEdges.tsx` — LineSegments for co-activation
- [ ] `frontend/src/components/FeatureGlow.tsx` — Emissive pulse animation
- [ ] `frontend/src/components/AblationParticles.tsx` — Points burst on feature death
- [ ] `frontend/src/components/FeatureInspector.tsx` — Hover tooltip
- [ ] `frontend/src/components/InterventionPanel.tsx` — Ablation + steering controls
- [ ] `frontend/src/components/LayerNavigator.tsx` — Layer selection slider
- [ ] `frontend/src/components/ResponseComparator.tsx` — Side-by-side diff view
- [ ] `frontend/src/components/FeatureJournal.tsx` — Supermemory-backed history

### Hooks & Utilities
- [ ] `frontend/src/hooks/useFeatures.ts` — Fetch + cache feature data
- [ ] `frontend/src/hooks/useAblation.ts` — Ablation API calls
- [ ] `frontend/src/hooks/useSteering.ts` — Steering API calls
- [ ] `frontend/src/audio/SoundEngine.ts` — Audio manager (5 SFX)

### Configuration
- [ ] `frontend/package.json` — Spec'd in STACK.md (ready to copy)
- [ ] `frontend/tsconfig.json`
- [ ] `frontend/vite.config.ts`
- [ ] `frontend/index.html`

### Cloudflare Worker
- [ ] `worker/src/worker.ts` — CF Workers API proxy
- [ ] `worker/wrangler.toml` — Spec'd in STACK.md

---

## Priority Order for Implementation

1. **Scaffold** — Vite + React + TS + Tailwind + shadcn/ui
2. **Store** — `useSynapseStore.ts` with mock data
3. **NeuronGraph** — InstancedMesh rendering (code already written in ARCHITECTURE.md)
4. **PromptConsole** — Input UI
5. **API Integration** — Connect to Modal backend (needs backend running)
6. **Ablation Animation** — GSAP timeline for the "surgery" moment
7. **ResponseComparator** — Side-by-side with diff highlighting
8. **Polish** — Sound, particles, edges, FeatureJournal, loading states
