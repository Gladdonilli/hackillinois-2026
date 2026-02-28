# LARYNX Frontend Refactor Log

**Date:** Feb 28, 2026
**Scope:** Systematic cleanup pass across the entire frontend. Extracted magic numbers, fixed visual bugs, improved code quality.

---

## Wave 1: Constants Extraction

Created `src/constants.ts` (212 lines) as the single source of truth for every magic number in the codebase.

Exports: `COLORS`, `COLORS_RGBA`, `VELOCITY_THRESHOLDS`, `CAMERA`, `SCENE`, `TIMING`, `SPRING`, `POST_PROCESSING`, `TONGUE`, `GLITCH`, `Z_INDEX`

All values use `UPPER_SNAKE_CASE` with `as const` assertions.

---

## Wave 2: Per-Component Migration

### 2A: CompareView.tsx
- Replaced all hardcoded hex colors: `#FF3366` → `COLORS.VIOLATION`, `#00FFFF` → `COLORS.CYAN`, `#00FF88` → `COLORS.GENUINE`
- Migrated Tailwind classes to v3 tokens
- Camera now reads from `CAMERA.COMPARE_POSITION`, model Y from `SCENE.COMPARE_MODEL_Y`
- Fixed missing `)` closing the return statement in VelocityGraph
- Removed unused `labelA` variable

### 2B: ClosingScreen.tsx
- Migrated old color tokens to v3 design system
- Added "Built by Gladdon (tianyi)" credit line

### 2C: LandingScene.tsx (MouthBeacon + FaceModel)
- MouthBeacon repositioned from `[1.2, -1.5, 2.5]` to `SCENE.MOUTH_BEACON_POSITION` (`[0, -1.1, 0.5]`)
- Arrow rotation flipped for correct orientation
- Face model scale, position, and parallax values extracted to `SCENE` constants

### 2D: TechnicalDetailPanel.tsx
- All 5 stat blocks changed from `flex items-baseline gap-1` to `flex-col` so labels stack above values instead of overlapping

### 2E: App.tsx
- Removed WaveformDisplay + VelocityHUD overlay from the complete state. Only VerdictPanel renders now.
- All timing values migrated to `TIMING` constants
- Spring configs migrated to `SPRING` constants
- Added error state UI (previously rendered a black screen on failure)
- Fixed subtitle contrast: `text-cyan/50` → `text-dim`

### 2F: Constants Migration (7 files)
Replaced hardcoded values with imported constants in:
- `VerdictPanel.tsx`
- `WarpTransition.tsx`
- `IntroSequence.tsx`
- `PostProcessingEffects.tsx`
- `TongueModel.tsx`
- `CameraController.tsx`
- `AnalysisView.tsx`

---

## Wave 3: Code Quality + DOM Cleanup

### 3A: Debug Removal
- Removed `window.__LARYNX_STORE` debug hook from `App.tsx`
- Removed `console.warn` from `useLarynxStore.ts`
- Fixed empty catch block in `IntroSequence.tsx`

### 3B: WaveformDisplay.tsx
- Replaced 7 `document.getElementById` calls with `useRef` bindings
- Removed all `id` attributes from JSX
- Added null checks on all `ref.current` mutations

### PostProcessingEffects.tsx
- Removed duplicate `EffectComposer` that was stacking chromatic aberration from `LandingScene.tsx`
- Reduced baseline chromatic aberration: `0.002` → `0.0004`
- Reduced bloom baseline: `0.5` → `0.3`
- Fixed `as const` type narrowing: widened `targetOffset` to `number`

---

## Build Verification

| Check | Result |
|-------|--------|
| `tsc --noEmit` | 0 new errors (13 pre-existing in `SoundEngine.ts`, separate workstream) |
| `vite build` | Pass. 3569 modules, 8.56s, 10 chunks, ~601KB gzip |
