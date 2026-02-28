# LARYNX Frontend — What's NOT Done

Everything below must be resolved or implemented before the frontend is buildable. The architecture, component tree, API contracts, formant mapping, and velocity thresholds are fully spec'd — this file tracks **only** what's missing.

---

## Unresolved Design Decisions

### 1. CSS Framework
**Not in current LARYNX stack.** `package.json` has no Tailwind.

**Recommendation:** Add Tailwind CSS (same as SYNAPSE). All pre-built component libraries require it. Shared `cn()` utility needed.

**Add to package.json:**
```json
"tailwindcss": "^3.4.16",
"postcss": "^8.4.49",
"autoprefixer": "^10.4.20",
"clsx": "^2.1.1",
"tailwind-merge": "^2.6.0"
```

### 2. Component Library
**Not in current LARYNX stack.**

**Recommendation:** shadcn/ui. Gives UploadPanel (Button, drag-drop zone), VerdictPanel (Badge, Progress), HistoryPanel (Table/List) for free. Same setup as SYNAPSE — shared infrastructure.

### 3. Head Model Asset Pipeline
**Documented but not executed.** ARCHITECTURE.md specifies:
- Ready Player Me → ARKit 52-blendshape GLTF
- Blender 4.x Boolean slice for sagittal view
- `gltfjsx` CLI for React component generation
- MeshTransmissionMaterial (transmission=0.9, chromaticAberration=0.5, thickness=2.5)

**What's missing:**
- [ ] Actual `.glb` file doesn't exist — needs to be created in Blender
- [ ] Which specific Ready Player Me model to download?
- [ ] Boolean cut plane positioning (exact coordinates)
- [ ] Morph target mapping: which of the 52 ARKit blendshapes map to formant-derived articulatory params?
- [ ] Tongue model — separate mesh or part of head? Shape key vs skeletal animation?

**Risk:** This is the highest-effort asset creation task. If it takes too long, fallback to a stylized procedural geometry tongue (capsule + deformation shader) inside a transparent sphere "skull."

### 4. VelocityShaderMaterial
**Mentioned in component tree but not spec'd.** "flesh→red→glitch based on speed" — needs:
- [ ] Shader code (GLSL or Three.js ShaderMaterial)
- [ ] Color ramp definition (what color at what velocity?)
- [ ] Glitch effect implementation (vertex displacement? UV offset? noise?)
- [ ] Performance impact assessment

**Recommendation:** Start with a simple color lerp via `meshStandardMaterial.color` driven by velocity in `useFrame`. Add glitch shader as polish if time allows.

### 5. VelocityRibbons
**Mentioned in component tree:** "trail geometry from tongue tip history." Not spec'd.
- [ ] Trail implementation (TubeGeometry from position history? Line2 with width? Custom BufferGeometry?)
- [ ] Trail length (how many frames of history?)
- [ ] Trail color (match velocity coloring?)
- [ ] Performance with continuous BufferGeometry updates

**Recommendation:** Use drei's `<Trail>` component as starting point. It wraps MeshLine and handles the buffer management.

### 6. CameraController GSAP Timeline
**Mentioned as "zoom choreography" but not detailed.**
- [ ] Starting camera position/rotation
- [ ] Zoom-in sequence timing (on analysis start? On formant extraction? On verdict?)
- [ ] Camera angles for key demo moments (tongue clip, velocity spike, verdict reveal)
- [ ] OrbitControls enable/disable during scripted movements

**The demo script implies:** Upload → skull materializes (camera pulls in) → analysis runs (camera tracks tongue) → deepfake reveal (dramatic zoom to skull clip point) → verdict (camera pulls back to show full head + HUD).

### 7. Layout Architecture
**Not explicitly spec'd.** Component tree shows UploadPanel, AnalysisView (R3F + HUD overlays), HistoryPanel.

**Recommendation:** Two-state single page:
- **State 1 (Upload):** Centered UploadPanel, dark background, minimal UI
- **State 2 (Analysis):** Full-screen R3F Canvas with HUD overlays:
  - Top-left: waveform + formant overlay
  - Top-right: velocity gauges
  - Bottom-center: verdict badge + confidence
  - GSAP transition between states

### 8. Responsive Layout
**Same recommendation as SYNAPSE:** Desktop-only, min-width 1280px. The 3D skull visualization needs screen space.

---

## Missing Design Specs

### 9. Cold State / Upload Screen
**Gap:** What does the user see at app load before uploading audio?
- Dark screen with upload zone
- Background animation (subtle particles? Faint skull outline? Audio waveform placeholder?)
- Hook text from demo script: "Every deepfake detector tells you IF. None tell you WHY."

### 10. Loading States During Analysis
**Gap:** Analysis takes ~700ms for 5s audio but judges see SSE progress events streaming.
- What visual happens during each SSE stage?
  - `mel_ready` → ?
  - `formants_extracted` → ?
  - `velocity_computed` → ?
  - `anomaly_detected` → ?
  - `verdict_ready` → ?
- Skull materialization should be tied to a specific stage
- Progress bar? Stage labels? Both?

### 11. Color Palette / Design Tokens
**Gap:** "Dark mode" + "medical scanner" aesthetic mentioned but no actual colors.

**Needs:**
- Background: pure black (#000) vs dark gray vs blue-black
- Scanner/medical accent: teal? Green? White?
- Genuine verdict: green (confirmed in component tree)
- Deepfake verdict: red (confirmed)
- Velocity gauge: green→yellow→orange→red gradient
- Skull material: MeshTransmissionMaterial gives glass-like look — what base color?
- Tongue at rest: flesh tone? Stylized pink?
- HUD overlay panels: transparent glass? Solid dark? Bordered?
- PostProcessing Scanline suggests CRT/medical monitor aesthetic — lean into it?

### 12. Typography
**Gap:** No font choices specified.

**Recommendation:**
- Primary UI: Inter or system font stack
- Data/monospace: JetBrains Mono (velocity values, frame numbers, formant frequencies)
- Verdict badge: Heavy weight, possibly condensed (Impact-style)

### 13. Audio File Format Handling
**Spec says:** `.wav`, `.mp3`, `.ogg`, `.flac` accepted, max 10MB, resampled to 16kHz mono.
**Not spec'd:**
- Client-side format validation before upload?
- Waveform preview before analysis (FilePreview component mentions "waveform thumbnail")
- Web Audio API decode for preview or server-side only?

**Recommendation:** Use Web Audio API `decodeAudioData()` for client-side waveform preview. Server handles all actual processing.

---

## Missing Implementation (Zero Source Code)

Every file listed in STACK.md needs creation. The LARYNX file structure is not explicitly spelled out like SYNAPSE's, so here's the inferred list:

### Core Files (Critical Path)
- [ ] `frontend/src/main.tsx` — App entry point
- [ ] `frontend/src/App.tsx` — Root component with two-state layout
- [ ] `frontend/src/store/useLarynxStore.ts` — Zustand store (interface in ARCHITECTURE.md)
- [ ] `frontend/src/types/larynx.ts` — TypeScript interfaces (Verdict, EMAFrame, etc.)
- [ ] `frontend/src/components/UploadPanel.tsx` — Drag-drop + analyze button
- [ ] `frontend/src/components/AnalysisView.tsx` — R3F Canvas wrapper

### 3D Components
- [ ] `frontend/src/components/HeadModel.tsx` — GLTF loader + MeshTransmissionMaterial
- [ ] `frontend/src/components/TongueModel.tsx` — Morph target driven mesh (REQUIRES .glb asset)
- [ ] `frontend/src/components/EMAMarkers.tsx` — 6 glowing spheres at articulator positions
- [ ] `frontend/src/components/VelocityRibbons.tsx` — Trail geometry
- [ ] `frontend/src/components/CameraController.tsx` — GSAP camera timeline

### HUD Components
- [ ] `frontend/src/components/VelocityHUD.tsx` — Speed gauges per articulator
- [ ] `frontend/src/components/WaveformDisplay.tsx` — Canvas 2D waveform + formant overlay
- [ ] `frontend/src/components/VerdictPanel.tsx` — Verdict badge + confidence + evidence

### Hooks & Utilities
- [ ] `frontend/src/hooks/useAnalysisStream.ts` — EventSource → Zustand store
- [ ] `frontend/src/audio/SoundEngine.ts` — Tone.js audio manager (6+ sounds)

### Configuration
- [ ] `frontend/package.json` — Spec'd in STACK.md (ready to copy)
- [ ] `frontend/tsconfig.json`
- [ ] `frontend/vite.config.ts`
- [ ] `frontend/index.html`

### Assets (NOT code — requires Blender)
- [ ] `frontend/public/models/head.glb` — Sagittal-sliced ARKit head
- [ ] `frontend/public/models/tongue.glb` — Tongue mesh with shape keys (if separate)
- [ ] `frontend/public/sounds/` — Audio sprite sheet for SFX

### Cloudflare Worker
- [ ] `worker/src/worker.ts` — CF Workers API proxy (code in ARCHITECTURE.md)
- [ ] `worker/wrangler.toml`

---

## Critical Path Difference from SYNAPSE

LARYNX has one hard dependency SYNAPSE doesn't: **the 3D head model**. The entire demo centers on the tongue-through-skull visualization, which requires:

1. A Blender-processed ARKit GLTF with correct morph targets
2. Formant→morph target mapping validation (do the articulatory params actually move the tongue correctly?)
3. MeshTransmissionMaterial tuning (does the x-ray glass look good?)

**If the 3D model blocks progress**, the fallback is:
- Transparent sphere (skull proxy) + procedural capsule geometry (tongue proxy) with position-based deformation
- Less impressive but eliminates the Blender dependency entirely
- Morph targets replaced by direct position/scale manipulation in `useFrame`

## Priority Order for Implementation

1. **Scaffold** — Vite + React + TS + Tailwind + shadcn/ui
2. **Store** — `useLarynxStore.ts` with mock EMA frame data
3. **UploadPanel** — Drag-drop UI
4. **HeadModel** — Load GLTF, apply MeshTransmissionMaterial (BLOCKED on asset)
5. **TongueModel** — Morph target driving from store (BLOCKED on asset)
6. **useAnalysisStream** — SSE EventSource hook
7. **VelocityHUD** — Speed gauges
8. **VerdictPanel** — Verdict display
9. **CameraController** — GSAP camera choreography
10. **SoundEngine** — Tone.js integration
11. **Polish** — VelocityRibbons, EMAMarkers, PostProcessing tuning, WaveformDisplay
