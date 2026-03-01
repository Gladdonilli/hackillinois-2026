# LARYNX Frontend Fixes Log

**Session Date:** 2026-03-01
**Verified:** `tsc --noEmit` = 0 errors, `vite build` = clean after each round

---

## Round 1 — Demo-Breaking Bugs (10 fixes, 8 files)

| # | File | Fix | Why |
|---|------|-----|-----|
| 1 | `App.tsx:149,152` | IEC alarm threshold `80→20` cm/s | Backend breach fires at 20, alarm never triggered during demo |
| 2 | `AnalysisView.tsx:114` | Inner `<Suspense fallback={null}>` comment clarified | Potential black screen during model load |
| 3 | `VelocityHUD.tsx:106-111` | Velocity calc `*30` → `/dt` (framerate-independent) | Wrong on 144Hz or throttled tabs |
| 4 | `VerdictPanel.tsx:85,95,96` | Glitch text: hardcoded "DEEPFAKE" → `verdict.isGenuine ? "GENUINE" : "DEEPFAKE"` | Flickers wrong text for genuine verdicts |
| 5 | `WaveformDisplay.tsx:282-283` | Formants bounds check + typed (`any` → `FormantData \| undefined`) | NaN coordinates if stream data sparse |
| 6 | `useAnalysisStream.ts:137-145` | Ghost/unreachable code block removed | Duplicate frame handler without case label |
| 7 | `LandingScene.tsx:340` | Added cloned scene material disposal on unmount | Geometry/material leak on scene transitions |
| 8 | `VerdictPanel.tsx:307` | COMPARE ANALYSIS button → `setStatus('comparing')` | Dead-end button with no onClick |
| 9 | `TongueModel.tsx:17,51-56` | `Math.min(delta, 0.1)` clamping on lerp | NaN/Infinity on tab throttle (delta > 0.1) |
| 10 | `useLarynxStore.ts:161` | `isFinite()` guard on T1 sensor data | NaN propagation from bad backend data |

**Cancelled (already correct):**
- VelocityRibbons.tsx — pre-allocated refs, no `new THREE.*` in useFrame
- SoundEngine.ts dispose — already handles masterHighpass/masterLimiter

---

## Round 2 — Post-Analysis Flow (4 fixes)

| # | File | Fix | Why |
|---|------|-----|-----|
| 1 | `useComparisonStream.ts` | Added `useEffect` cleanup to abort SSE on unmount | SSE stays open if user navigates away, corrupts next session |
| 2 | `TechnicalDetailPanel.tsx:34-193` | Stats wired to store (`verdict.peakVelocity`, `verdict.confidence`, `frames.length`) + formant canvas reads real `formants[]` | ALL stats were hardcoded (184, 99.9, etc.) |
| 3 | `CompareView.tsx:301-316` | Added "← BACK TO VERDICT" + "NEW ANALYSIS" navigation buttons | Missing `comparing→complete` back-transition, dead-end state |
| 4 | `useLarynxStore.ts reset` | Verified already correct (false positive) | `resetAnalysis()` already clears `formants: []` |

---

## Round 3 — Animation Timing & Transition Smoothness

| # | File | Fix | Why |
|---|------|-----|-----|
| 1 | `constants.ts` | Added `INTRO_DURATION_MS`, `WARP_FLASH`, `WARP_TUNNEL_FADE`, `CLOSING_*`, `STATS_*` constants | Centralize magic numbers, prevent desync |
| 2 | `IntroSequence.tsx:27` | `5500` → `TIMING.INTRO_DURATION_MS` | Hardcoded timer not in constants |
| 3 | `WarpTransition.tsx:33,43` | `0.1`/`0.2` → `TIMING.WARP_FLASH`/`TIMING.WARP_TUNNEL_FADE` | Hardcoded durations |
| 4 | `App.tsx` | `duration-600` → `duration-500` on closing transition | Inconsistent with other stage transitions |
| 5 | `CameraController.tsx` | skull-clip setTimeout → `CAMERA.SKULL_CLIP_RETURN_DELAY_S * 1000` | Hardcoded delay, constant already exists but unused |
| 6 | `ClosingScreen.tsx` | 6 stagger delays → `TIMING.CLOSING_*` constants | Magic numbers |
| 7 | `TechnicalDetailPanel.tsx` | 5 stat durations → `TIMING.STATS_*` constants | Magic numbers |

---

## Known Remaining (Not Demo-Breaking)

- CompareView MiniModel jaw uses `Math.sin` (acceptable — real data needs SSE refactor)
- GenerateComparePanel uses `/api/transcribe` (unverified Worker route)
- VerdictPanel has 9 hardcoded GSAP durations (functional, could be centralized)
- CameraController has 18 hardcoded transition durations (functional, could be centralized)
- No exit animations between main states (idle→analyzing→complete) — by design, R3F Canvas teardown incompatible
- VelocityHUD lerp at 50ms setInterval (20fps) vs useFrame 60fps — minor visual jitter
- Index chunk at 1049KB (pre-existing, cosmetic Vite warning)
