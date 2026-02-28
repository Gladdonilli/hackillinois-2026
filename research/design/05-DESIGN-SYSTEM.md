# LARYNX Design System v2 — "Clinical Authority + Earned Spectacle"

**Date:** 2026-02-28
**Status:** Consolidated specification from all research tracks
**Core Principle:** 90% monochrome silence. Color, motion, and sound are EARNED by the data. The violation hits 10x harder because everything else is quiet.

---

## I. COLOR SYSTEM

### Philosophy
Color is a scarce resource. If a judge can identify your "brand color" at rest, you're too decorative. Color = data state only.

### Base Palette (The Lab)

| Token | Hex | Use | Contrast |
|-------|-----|-----|----------|
| `--bg-void` | `#09090B` | App background (zinc-950) | — |
| `--bg-surface` | `#18181B` | Panel backgrounds (zinc-900) | — |
| `--border` | `#27272A` | 1px structural dividers (zinc-800) | — |
| `--text-muted` | `#71717A` | Labels, units, axis marks (zinc-500) | 4.6:1 (AA) |
| `--text-secondary` | `#A1A1AA` | Descriptions, metadata (zinc-400) | 7.5:1 (AAA) |
| `--text-primary` | `#E4E4E7` | Data readouts, body (zinc-200) | 13.7:1 (AAA) |
| `--text-bright` | `#FAFAFA` | Active/selected only (zinc-50) | 17.4:1 (AAA) |

**Rule:** Never use pure `#000`/`#FFF` together — 21:1 contrast causes halation (blur/halo effect) for ~50% of people. `#09090B` + `#E4E4E7` = 13.7:1, WCAG AAA, no halation.

### Data State Colors (Velocity Escalation)

| State | Velocity | Color | Stroke | Opacity | Visual Weight |
|-------|----------|-------|--------|---------|---------------|
| Normal | <50 cm/s | `#38BDF8` medical cyan | 1px | 60% | Calm, expected |
| Elevated | 50-100 | `#FDE047` caution yellow | 2px | 80% | Attention |
| Warning | 100-150 | `#EA580C` high-vis orange | 2px | 100% | Alarm |
| Critical | >150 cm/s | `#DC2626` alizarin red | 3px | 100% + 8px bloom | Violation |

**From medical UI research:** Don't just change hue — change *visual weight* simultaneously. Stroke width, opacity, AND bloom all escalate together. This is how real patient monitors work (IEC 60601-1-8).

### The Skull Clip Moment

| Element | Before Clip | During Clip |
|---------|-------------|-------------|
| Skull | `#52525B` wireframe | Same (anchor of normalcy) |
| Tongue | `#0891B2` translucent cyan | `#FF003C` solid laser red, unshaded |
| Background | `#09090B` | Drops to absolute `#000000` |
| Text | Full opacity | Fades to 30% opacity |
| Post-processing | None | 0.1s chromatic aberration spike, decays 2s |
| All other UI | Normal saturation | Desaturates to 20% — only violation retains color |

**Pulse only the violating metric + velocity ribbon segment.** Medical alarms flash at 2Hz (red↔black) — apply to velocity readout number only.

### Trace Colors (Data Visualization Lines)

| Data Type | Color | Purpose |
|-----------|-------|---------|
| Raw audio waveform | `#52525B` zinc-600 | Muted, background layer |
| Extracted features | `#38BDF8` medical cyan | Active analysis |
| Physical mapping | `#A78BFA` violet | Articulatory data |

### CSS Variables

```css
:root {
  --bg-void: #09090B;
  --bg-surface: #18181B;
  --border: #27272A;
  --text-muted: #71717A;
  --text-secondary: #A1A1AA;
  --text-primary: #E4E4E7;
  --text-bright: #FAFAFA;

  --data-normal: #38BDF8;
  --data-elevated: #FDE047;
  --data-warning: #EA580C;
  --data-critical: #DC2626;
  --data-violation: #FF003C;

  --trace-raw: #52525B;
  --trace-features: #38BDF8;
  --trace-physical: #A78BFA;

  --tongue-normal: #0891B2;
  --skull-wireframe: #52525B;

  --verdict-genuine: #2DD4BF;
  --verdict-deepfake: #EF4444;
}
```

---

## II. TYPOGRAPHY

### Font Pairing

**Primary:** Inter (UI, labels, descriptions)
**Data:** IBM Plex Mono (numbers, readouts, measurements)

Inter is screen-optimized with optical sizing. IBM Plex Mono has a clinical lab feel with distinct `0/O/1/l/I` glyphs — critical for a forensic tool where misreading data destroys credibility.

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
```

### Type Scale

| Element | Size/Line-Height | Tailwind Class | Use |
|---------|-----------------|----------------|-----|
| Micro-Label | 10px / 1.0 | `text-[10px] leading-none uppercase tracking-widest text-zinc-500 font-semibold` | Panel headers, axis labels, units ("CM/S", "Hz") |
| Data Secondary | 12px / 1.25 | `text-xs leading-tight font-mono tabular-nums text-zinc-400` | Timestamps, coordinates, secondary metrics |
| Body/UI | 14px / 1.375 | `text-sm leading-snug text-zinc-300` | Tooltips, descriptions, status text |
| Data Primary | 24px / 1.0 | `text-2xl leading-none font-mono tabular-nums text-white` | Current velocity, formant values |
| Hero Metric | 72px / 1.0 | `text-7xl leading-none font-mono tabular-nums tracking-tighter text-white` | Final verdict confidence score |

### Number Typography (Non-Negotiable for Real-Time)

```css
.data-readout {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
  text-align: right;
}
```

- Always `value.toFixed(1)` — never let decimal places shift
- Width-lock primary readouts with fixed `ch` widths per digit group
- Right-align all numeric columns for decimal stacking

### Verdict Typography

| Verdict | Style | Rationale |
|---------|-------|-----------|
| **GENUINE** | `text-teal-400 text-sm uppercase tracking-[0.2em] font-medium` — static, unmoving | Calm confirmation. Teal not green (too "gamey") — teal reads clinical |
| **DEEPFAKE** | `text-red-500 text-xl uppercase tracking-[0.2em] font-bold` + text-shadow bloom | Instant snap. No transition. |

DEEPFAKE text-shadow:
```css
text-shadow: 0 0 10px rgba(239, 68, 68, 0.6),
             0 0 20px rgba(239, 68, 68, 0.4);
```

---

## III. LAYOUT — "Instrument Panel"

### Grid Structure

```
┌─────────────────────────────────────────────────────┐
│ [MICRO-LABEL: LARYNX]            [STATUS DOT] READY │  ← 40px header
├────────────────────────────┬────────────────────────┤
│                            │ ┌──────────────────┐   │
│                            │ │ VELOCITY          │   │
│                            │ │ 184.2 cm/s       │   │  ← Data Primary
│                            │ │ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │   │
│      3D VIEWPORT           │ ├──────────────────┤   │
│      (skull + tongue)      │ │ FORMANTS          │   │
│      65% width             │ │ F1: 342  F2: 1847│   │
│                            │ │ F3: 2641          │   │
│                            │ ├──────────────────┤   │
│                            │ │ CONFIDENCE        │   │
│                            │ │ ████████░░ 94.4%  │   │
│                            │ └──────────────────┘   │
│                            │        35% width       │
├────────────────────────────┴────────────────────────┤
│ ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ WAVEFORM / TIMELINE ╌╌╌╌╌╌╌╌╌╌╌╌ │  ← 150px fixed
│     ~~~~∿∿∿∿∿∿∿∿∿∿∿∿~~~∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿~~~  │     100% width
└─────────────────────────────────────────────────────┘
```

### Panel Anatomy

Each data panel follows this structure:
```
┌ MICRO-LABEL (left)                    ● STATUS DOT (right) ┐
├────────────────────────────────────────────────────────────┤
│ Data payload                                               │
│ (large numbers, charts, or status indicators)              │
└────────────────────────────────────────────────────────────┘
```

### Clinical Design Rules

| Rule | CSS | Rationale |
|------|-----|-----------|
| Zero drop shadows | `shadow-none` | Medical instruments don't have elevation |
| Sharp edges | `rounded-none` or `rounded-sm` (2px max) | Precision over friendliness |
| Hairline borders | `border border-zinc-800` (1px) | Structure without weight |
| CAD-style crosshairs | `border-dashed` inside 3D viewport | Scanner/measurement tool feel |
| Hierarchy via opacity | `text-white` → `text-zinc-500` | Not via color (color = data only) |
| No backdrop blur | Remove all `backdrop-blur` | Blur is consumer, not instrument |

---

## IV. MICRO-INTERACTIONS & ANIMATION

### Master Easing Table

| Type | Duration | GSAP | CSS | Use |
|------|----------|------|-----|-----|
| Micro-interaction | 150ms | `power4.out` | `cubic-bezier(0.25, 1, 0.5, 1)` | Hovers, toggles, tooltips |
| Structural Shift | 300ms | `power3.out` | `cubic-bezier(0.32, 0.72, 0, 1)` | Upload → Analysis view |
| Data Reveal | 600ms | `expo.out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Formant trajectories drawing in |
| Tension Build | 2500ms | `expo.in` | `cubic-bezier(0.5, 0, 1, 1)` | Final analysis acceleration |
| **The Violation** | **0ms** | `steps(1)` | **none** | Tongue clips bone — **NO smoothing** |
| Post-Violation Decay | 1200ms | `power4.out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Bloom/aberration returning to baseline |

### State Transition Choreography

#### Idle → Uploading (400ms, `power2.inOut`)
- Upload zone morphs into analysis HUD
- Panels slide in from edges with 50ms stagger

#### Uploading → Analyzing ("Staggered Indeterminacy")
- Progress bar pauses at 14%, jumps to 38%, hangs at 89%, then snaps to 100%
- Micro camera shakes: `gsap.to(camera, { x: '+=0.02', duration: 0.05, ease: RoughEase })`
- This makes analysis feel *unpredictable* — like a real instrument probing

#### Analyzing → Verdict ("The Snap")
- **0ms state change** — analysis UI instantly disappears (no fade)
- Skull snaps to violation coordinate
- Chromatic aberration spikes to 1.0, decays over 2s `expo.out`
- 400ms freeze right before the snap (tension beat)

### Haptic-Feeling Interactions

**Button press:**
```css
.clinical-button:active {
  transform: scale(0.96);
  transition: transform 0.1s cubic-bezier(0.2, 0, 0, 1);
}
```

**Magnetic data points** (40px threshold):
```typescript
const pull = 0.4;
const dist = cursor.distanceTo(dataPoint);
if (dist < 40) {
  cursor.lerp(dataPoint, pull * (1 - dist / 40));
}
```

**Spring configs (motion/framer-motion):**
- Snappy zero-bounce: `{ stiffness: 400, damping: 30 }`
- Clinical mechanical settle: `{ stiffness: 200, damping: 15 }`

### Cursor
Clinical crosshair — not a playful circle. `mix-blend-mode: exclusion` on a white `+` shape for universal contrast.

### Real-Time Data Animation

```typescript
// NEVER gsap.to() for streaming data — use quickTo (4x faster)
const moveX = gsap.quickTo(mesh.position, 'x', { duration: 0.1, ease: 'power3.out' });

// Number scrubbing for velocity readout
gsap.to(counterObj, {
  val: 184.5,
  duration: 1.2,
  ease: 'expo.out',
  onUpdate: () => { ref.current.innerText = counterObj.val.toFixed(1); }
});
```

### Sound-Visual Sync

Audio dictates visual — never the reverse. Use `Tone.Draw.schedule()`:

```typescript
Tone.Draw.schedule(() => {
  gsap.to(bloomEffect, { intensity: 1.0, duration: 0.1 });
  playSubImpact();
}, Tone.now());
```

---

## V. WHAT TO STRIP (Unearned → Earned Spectacle)

| Remove/Reduce | Replace With | Why |
|----------------|-------------|-----|
| Sparkles, Stars, ParticleField | Empty void (`#09090B`) | Silence > noise |
| Always-on post-processing | Data-triggered only (bloom at >100 cm/s) | Effects earned by physics |
| Horror drone ambient | Near-silence + Geiger clicks | ICAD: drones mask signals |
| Warp portal (z=8→0.1, FOV 60→110) | Camera holds steady, skull rotates | Reduces WebGL crash risk |
| Rounded corners, shadows, blur | Hairline borders, sharp corners, opacity | Medical instrument, not consumer app |
| Cyan accent always visible | Zinc monochrome at rest, color on data only | Color scarcity amplifies violation |

---

## VI. IMPLEMENTATION CHECKLIST

### Fonts
- [ ] Add Google Fonts: Inter 400/500/600 + IBM Plex Mono 400/500/600
- [ ] Tailwind config: `fontFamily: { sans: ['Inter'], mono: ['IBM Plex Mono'] }`

### Colors
- [ ] Define CSS custom properties (see Section I)
- [ ] Audit all hardcoded hex values → replace with tokens
- [ ] Remove any decorative color use (color = data state ONLY)

### Typography
- [ ] Audit all real-time number displays → add `font-mono tabular-nums`
- [ ] Ensure all velocity/formant readouts use `toFixed(1)`
- [ ] Implement type scale (Section II) across all components

### Layout
- [ ] Strip: `shadow-lg`, `rounded-xl`, `backdrop-blur`
- [ ] Replace with: `border border-zinc-800 bg-[#09090B] rounded-none`
- [ ] Verify 65/35 viewport/data split

### Animation
- [ ] Audit all transitions → apply master easing table
- [ ] Implement 400ms freeze before violation
- [ ] Ensure violation moment is 0ms (no transition)
- [ ] Replace `gsap.to()` with `gsap.quickTo()` for streaming data

### Post-Processing
- [ ] Disable bloom/aberration by default
- [ ] Gate behind velocity thresholds (>100 cm/s)

### Sound
- [ ] Reduce ambient to silence baseline
- [ ] Add Geiger velocity click mapping
- [ ] Add IEC-compliant alarm burst for violation
- [ ] Keep data-driven triggers, remove theatrical effects

### Cursor
- [ ] Replace default with clinical crosshair
- [ ] `mix-blend-mode: exclusion` for contrast
