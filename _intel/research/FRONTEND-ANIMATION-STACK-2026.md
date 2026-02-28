# Frontend Web Animation Stack — February 2026

Research compiled for HackIllinois 2026 hackathon project.

---

## Tier 1: The Two Pillars (Use Both)

### Motion (formerly Framer Motion)

**Package**: `npm install motion` → `import { motion } from 'motion/react'`
(or `motion/react-client` for Next.js smaller bundle)

| Aspect                | Detail                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Engine**            | Hybrid — auto-compiles to WAAPI for opacity/transform/filter (off-main-thread, GPU-composited 60/120fps even when main thread blocked). Falls back to JS rAF for springs/layout animations |
| **React 19 / Next.js 15** | Full support. `"use client"` required. `LazyMotion` + `<m.div>` for tree-shaking (~15kb)                                                                                              |
| **Sweet spot**        | UI micro-interactions, state-driven animations, layout morphing, modal enter/exit                                                                                                          |

**Killer patterns:**

```tsx
// Scroll reveal (zero-config, fastest hackathon polish)
<motion.div
  initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
  whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
  viewport={{ once: true, margin: '-100px' }}
  transition={{ duration: 0.6 }}
/>

// Micro-interactions
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
/>

// Shared element morph (e.g., card → detail page)
<motion.div layoutId={`card-${id}`} />

// Staggered list
const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => <motion.li key={i} variants={item} />)}
</motion.ul>

// Page transitions
<AnimatePresence mode="wait">
  <motion.div key={pathname}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
  />
</AnimatePresence>
```

---

### GSAP 3.14 (GreenSock)

**MASSIVE CHANGE**: Webflow acquired GSAP mid-2025. ALL premium plugins now FREE — ScrollSmoother, SplitText, MorphSVG, DrawSVG, Flip. Still proprietary license (not OSS) but zero cost for developers.

**React hook**: `@gsap/react` → `useGSAP({ scope: containerRef })` — auto-cleanup on unmount, scoped CSS selectors, React 18+ Strict Mode safe.

| Plugin (ALL FREE) | What It Does                                             |
| ----------------- | -------------------------------------------------------- |
| ScrollTrigger     | Pin, scrub, snap, batch — unmatched by any competitor    |
| SplitText         | Split text into chars/words/lines for kinetic typography |
| ScrollSmoother    | Native smooth scroll with parallax                       |
| MorphSVG          | SVG path morphing between shapes                         |
| DrawSVG           | Animated SVG path drawing                                |
| Flip              | FLIP animation utility for layout changes                |
| Observer          | Gesture/scroll/touch detection                           |

**Killer patterns:**

```tsx
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

function HeroSection() {
  const container = useRef(null);

  useGSAP(() => {
    // Kinetic typography
    const split = new SplitText('.hero-title', { type: 'chars,words' });
    gsap.from(split.chars, {
      opacity: 0, y: 50, rotateX: -90,
      stagger: 0.02, duration: 0.8, ease: 'back.out(1.7)',
      scrollTrigger: { trigger: '.hero-title', start: 'top 80%' }
    });

    // Horizontal scroll section
    const panels = gsap.utils.toArray('.panel');
    gsap.to(panels, {
      xPercent: -100 * (panels.length - 1),
      ease: 'none',
      scrollTrigger: {
        trigger: '.panels-container',
        pin: true,
        scrub: 1,
        snap: 1 / (panels.length - 1),
        end: () => '+=' + document.querySelector('.panels-container').offsetWidth,
      }
    });

    // Pinned scroll storytelling
    ScrollTrigger.create({
      trigger: '.story-section',
      start: 'top top',
      end: '+=300%',
      pin: true,
      scrub: true,
    });
  }, { scope: container });

  return <div ref={container}>...</div>;
}
```

### Anime.js v4 — Lightweight Alternative

**Package**: `npm install animejs` — ~3kb (WAAPI subpath) / ~10kb (standard)

Completely rewritten in TypeScript for v4. 50k+ GitHub stars. The `waapi.animate()` subpath offloads to browser compositor — same perf model as Motion but at 1/5th the bundle. Has built-in `splitText()` and `stagger()`.

Use when: you want GSAP-like sequencing without GSAP's proprietary license, or when bundle size is critical.

```tsx
import { waapi } from 'animejs';

// Off-main-thread animation via WAAPI
waapi.animate('.card', {
  translateY: [40, 0],
  opacity: [0, 1],
  delay: waapi.stagger(100),
  duration: 600,
  easing: 'outExpo',
});

// Text splitting built-in
const { chars } = waapi.splitText('.hero-title');
waapi.animate(chars, {
  translateY: [50, 0],
  opacity: [0, 1],
  delay: waapi.stagger(20),
});
```

### The 2026 Meta: Use BOTH

> Motion for React UI components (modals, lists, toggles, layout). GSAP for landing-page scroll narrative (parallax, pinning, text splitting, SVG animation). They coexist perfectly. Anime.js v4 is a viable GSAP alternative if you want MIT licensing and smaller bundle.

---

## Tier 2: Native Browser APIs (Zero Bundle Cost)

### CSS Scroll-Driven Animations

**Browser support**: Chrome/Edge ✅ (v115+), Safari ✅ (late 2024+), Firefox ⚠️ (behind flag)

**Polyfill**: `@flackr/scroll-timeline`

Runs entirely on compositor thread — immune to React rendering jank.

```css
/* Scroll-linked reveal — replaces IntersectionObserver for animation */
.card-reveal {
  animation: slide-up linear both;
  animation-timeline: view();
  animation-range: entry 10% cover 30%;
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scroll progress bar */
.progress-bar {
  animation: grow-width linear both;
  animation-timeline: scroll(root);
}

@keyframes grow-width {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* Parallax */
.parallax-bg {
  animation: parallax linear both;
  animation-timeline: scroll();
  animation-range: contain;
}

@keyframes parallax {
  from { transform: translateY(-20%); }
  to { transform: translateY(20%); }
}
```

**React integration**: Pure CSS modules or Tailwind — no hooks needed. Map React state to inline CSS variables for dynamic timelines.

### View Transitions API

**Browser support**: Chrome/Edge ✅ (SPA+MPA), Safari ✅ SPA (v18+), Firefox SPA ⚠️

No polyfill possible — graceful fallback to instant update.

```tsx
// SPA view transition in React
function navigate(newState) {
  if (!document.startViewTransition) {
    setState(newState);
    return;
  }
  document.startViewTransition(() => {
    flushSync(() => setState(newState));
  });
}

// MPA support (Next.js multi-page)
// In global CSS:
@view-transition { navigation: auto; }

// Element tracking across pages:
.product-image {
  view-transition-name: product-hero;
}
```

**React 19 `<ViewTransition>` component** (canary): Eliminates the `startViewTransition` + `flushSync` coordination dance entirely. Browser-native compositor snapshotting, 0kb additional cost. 100% RSC compatible since it's a React primitive.

**`next-view-transitions` package**: <1kb wrapper for Next.js App Router. Drop-in `<Link>` replacement that auto-wraps navigation in View Transitions. Use this until React 19 `<ViewTransition>` ships stable.

```tsx
// next-view-transitions — easiest Next.js integration
import { Link } from 'next-view-transitions';

// In layout.tsx
import { ViewTransitions } from 'next-view-transitions';

export default function Layout({ children }) {
  return (
    <ViewTransitions>
      <html><body>{children}</body></html>
    </ViewTransitions>
  );
}
```

**Gotchas:**
- `view-transition-name` MUST be unique on screen — duplicates silently fail
- Dynamic names in React: `style={{ viewTransitionName: isTransitioning ? \`item-${id}\` : 'none' }}`
- Always wrap in `@media (prefers-reduced-motion: no-preference)` for accessibility
- Next.js: use `next-view-transitions` package or experimental App Router support

### Verdict

- **CSS Scroll-Driven**: use for ALL scroll-linked effects (parallax, reveal, progress bars) — vastly superior to JS observers
- **View Transitions**: use for page navigations and list-to-detail expansions
- **Reserve Motion/GSAP** for physics-based micro-interactions native APIs can't express

---

## Tier 3: Smooth Scroll

### Lenis (by darkroom.engineering)

The current standard — has effectively replaced Locomotive Scroll for React/Next.js.

- 14k+ GitHub stars
- Lightweight smooth scroll normalizer (~3kb)
- Virtual scroll via rAF bound to native scroll coords — preserves accessibility (Ctrl+F, tab navigation)
- React wrapper: `@studio-freight/react-lenis` → `<ReactLenis root>`
- Integrates with GSAP ScrollTrigger: `lenis.on('scroll', ScrollTrigger.update)`
- `ReactLenis` provider needs `"use client"` but wraps RSCs via children

```tsx
import { ReactLenis } from '@studio-freight/react-lenis';

function App() {
  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.2, smoothWheel: true }}>
      <main>{children}</main>
    </ReactLenis>
  );
}
```

Locomotive Scroll v5 exists but the ecosystem has consolidated around Lenis.

---

## Tier 4: Pre-Built Animated Component Libraries

For instant hackathon polish with shadcn/ui + Tailwind. All follow the shadcn model — copy-paste into your project, not npm dependency. No lock-in.

### Magic UI

| Attribute | Detail |
|-----------|--------|
| **URL** | [magicui.design](https://magicui.design) |
| **Stars** | ~20.2k |
| **License** | MIT |
| **Components** | 150+ (Heroes, Bento, Marquees, Text, Backgrounds, Buttons) |
| **Under the hood** | Framer Motion + Tailwind CSS |
| **Install** | CLI: `npx magicui-cli add [component]` |
| **Dark mode** | Full support |
| **Accessibility** | Reduced-motion respected on most components |

**Standout components for hackathon:**
1. **Globe** — interactive 3D globe with arc connections (uses `cobe` under hood)
2. **Bento Grid** — responsive grid with animated hover states
3. **Retro Grid / Ripple** — animated background patterns
4. **Border Beam** — glowing animated border effect
5. **Shimmer Button** — premium CTA with traveling shimmer

**Gotcha**: Complex components (Globe) pull in sub-deps like `cobe`. Check bundle impact.

### Aceternity UI

| Attribute | Detail |
|-----------|--------|
| **URL** | [ui.aceternity.com](https://ui.aceternity.com) |
| **Stars** | ~10k+ |
| **License** | MIT |
| **Components** | 70+ complex set-pieces |
| **Under the hood** | Framer Motion + Tailwind, some use Three.js/R3F |
| **Install** | Manual copy-paste |
| **Dark mode** | Full support |

**Standout components for hackathon:**
1. **3D Pin / 3D Card** — perspective-shifting interactive cards
2. **Background Beams / Sparkles** — particle-heavy hero backgrounds
3. **Macbook Scroll** — pinned laptop mockup with scroll-driven screen content
4. **Text Hover Effects** — character-level hover distortion
5. **Tracing Beam** — scroll-following SVG line

**Gotcha**: Three.js components (3D Card Stack, Vortex) add 100kb+ to bundle. Use sparingly. Stick to FM-only components for best size/impact ratio.

### Motion Primitives (by Ibelick)

| Attribute | Detail |
|-----------|--------|
| **URL** | [motion-primitives.com](https://motion-primitives.com) |
| **License** | MIT |
| **Components** | ~40, focused on app UI (not landing pages) |
| **Under the hood** | Framer Motion |
| **Accessibility** | High — built with Radix patterns |

**Standout components for hackathon:**
1. **Morphing Dialogs** — seamless card-to-modal transitions
2. **Animated Tabs** — spring-physics tab indicator
3. **Text Scramble** — character scramble reveal effect
4. **Animated Number** — smooth digit transitions

Best for: functional app UI that needs to feel premium, not flashy landing pages.

### Animata

| Attribute | Detail |
|-----------|--------|
| **URL** | [animata.design](https://animata.design) |
| **Stars** | ~2k |
| **License** | MIT |
| **Components** | 80+ |
| **Install** | CLI: `npx animata@latest add [component]` |

**Standout components for hackathon:**
1. **Direction Aware Hover** — hover overlay follows cursor entry direction
2. **Liquid / Gooey Effects** — SVG filter-based morphing
3. **Magnetic Buttons** — cursor-attracted interaction

**Gotcha**: Heavy use of Tailwind arbitrary values (`[calc(...)]`) — can conflict with custom Tailwind configs.

### Cult UI

| Attribute | Detail |
|-----------|--------|
| **URL** | [cult-ui.com](https://cult-ui.com) |
| **License** | MIT |
| **Components** | ~30 |
| **Under the hood** | Radix UI + Framer Motion |
| **Accessibility** | VERY HIGH — Radix primitives throughout |

**Standout components:**
1. **Animated Navigation Menus** — staggered dropdown reveals
2. **Dynamic Inputs** — morphing input fields with validation animation

Best for: production-quality form/nav UX where accessibility matters.

### Syntax UI

| Attribute | Detail |
|-----------|--------|
| **URL** | [syntaxui.com](https://syntaxui.com) |
| **Stars** | ~1k |
| **License** | MIT |
| **Components** | ~50, block-focused |

Focus on full-section blocks: pricing tables, testimonial carousels, feature grids. Good for quickly assembling a marketing/landing page.

### Eldora UI

| Attribute | Detail |
|-----------|--------|
| **URL** | [eldoraui.site](https://eldoraui.site) |
| **License** | MIT |
| **Components** | 100+ |

Opinionated full-section layouts. Standouts: Bento Grids, Hero Sections, Feature Sections. Use when you want an entire page section, not individual components.

### Fancy Components

| Attribute | Detail |
|-----------|--------|
| **URL** | [fancycomponents.dev](https://fancycomponents.dev) |
| **License** | MIT |
| **Components** | ~25 |

Stylized and edgy. Standouts: Float/Hover Physics, Glitch Text. Best for creative/artistic projects where "weird" is a feature.

### HextaUI

500+ GitHub stars. Foundation blocks for functional apps — auth screens, AI chat interfaces, dashboards. Uses GSAP + Motion. Good starting scaffolding for hackathon apps that need to look complete fast.

### Lukacho UI

Minimalist aesthetic. Custom cursors, animated charts, premium tabs. Use for data-heavy dashboards that need subtle polish.

### Ibelick UI

| Attribute | Detail |
|-----------|--------|
| **URL** | [ui.ibelick.com](https://ui.ibelick.com) |

**Specialized for Dark Mode AI Interfaces.** Glowing borders, AI generation loaders, dark inputs with subtle light effects. If you're building an AI product at the hackathon, this is your go-to for that "ChatGPT but premium" aesthetic.

### Hackathon Component Strategy

Pick components surgically — don't install everything:

```
           WHAT YOU NEED              →  WHERE TO GRAB IT
           ─────────────────────────────────────────────────
           Base UI (buttons, inputs)  →  shadcn/ui
           App micro-interactions     →  Motion Primitives + Cult UI
           AI interface components    →  Ibelick UI
           Landing page hero/bento    →  Magic UI (bento) + Aceternity (backgrounds)
           Scroll narrative sections  →  GSAP ScrollTrigger
           Full page sections/blocks  →  Eldora UI + Syntax UI
           Edgy/creative effects      →  Fancy Components + Animata
```

**IMPORTANT**: Set up the `cn()` utility (clsx + tailwind-merge) in hour 1 — every single one of these libraries depends on it:

```tsx
// lib/utils.ts — do this FIRST
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Tier 5: The Glue Layer — Micro-Interactions & Utilities

The "glue" that turns a static app into a polished product. Each tool solves one specific UX moment.

### Toast / Notification Animations

| Library | Size | Tier | Notes |
|---------|------|------|-------|
| **Sonner** (`sonner`) | ~3kb | S | Stacked Vercel-style, 60fps WAAPI, swipe-to-dismiss. The 2026 default. |
| react-hot-toast | ~5kb | A | Previous king. Slightly dated defaults but customizable. |
| notistack | ~14kb | C | MUI-coupled. Avoid unless already in MUI. |

```tsx
// Sonner — drop-in, zero config
import { Toaster, toast } from 'sonner';

// In layout
<Toaster position="bottom-right" richColors />

// Anywhere
toast.success('Saved!');
toast.promise(saveData(), {
  loading: 'Saving...',
  success: 'Done!',
  error: 'Failed.',
});
```

### Number / Counter Animations

| Library | Size | Tier | Notes |
|---------|------|------|-------|
| **Number Flow** (`@number-flow/react`) | ~4kb | S | Uses `Intl.NumberFormat`, per-digit FLIP animation without state thrashing. Butter-smooth for live data. |
| react-countup | ~6kb | B | Good for "0 → 1,234 on scroll" moments. Bad for frequently updating values. |

```tsx
// Number Flow — smooth digit-by-digit transitions
import { NumberFlow } from '@number-flow/react';

<NumberFlow value={price} format={{ style: 'currency', currency: 'USD' }} />
// Each digit morphs independently when value changes
```

### Loading / Skeleton Animations

| Library | Size | Tier | Notes |
|---------|------|------|-------|
| **Tailwind shimmer** | 0kb | S | `animate-pulse` or custom gradient pseudo-element. Do NOT use a library for this in 2026. |
| react-loading-skeleton | ~3kb | B | Fine if you're not using Tailwind. |
| react-content-loader | ~2kb | B | SVG-based, good for complex content shapes. |

```css
/* Custom shimmer — better than animate-pulse */
.skeleton {
  background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted)/0.5) 50%, hsl(var(--muted)) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }
```

### Page / Route Transitions

| Library | Size | Tier | Notes |
|---------|------|------|-------|
| **next-view-transitions** | <1kb | S | Native View Transitions API wrapper. `view-transition-name` CSS morphing. |
| Framer Motion `template.tsx` | 0kb (already have FM) | A | Safari fallback. Works with App Router. |

```tsx
// Framer Motion template.tsx pattern (Safari + all browsers)
// app/template.tsx — NOT layout.tsx (template re-renders on navigation)
'use client';
import { motion, AnimatePresence } from 'motion/react';
import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

### Auto-Animate

**@formkit/auto-animate** — ~2.5kb, S-Tier

MutationObserver + FLIP + WAAPI. One ref on a parent container, zero config. Children added/removed/reordered get animated automatically.

```tsx
import { useAutoAnimate } from '@formkit/auto-animate/react';

function TodoList({ items }) {
  const [parent] = useAutoAnimate();
  return (
    <ul ref={parent}>
      {items.map(item => <li key={item.id}>{item.text}</li>)}
    </ul>
  );
}
// Items fade in, slide out, and reorder with spring physics — zero configuration
```

**Limitation**: Struggles with `display` type changes (e.g., `none` → `block`). Use Motion's `AnimatePresence` for those.

### Gesture / Drag-and-Drop

| Library | Size | Tier | Notes |
|---------|------|------|-------|
| **dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`) | ~12kb | S | Modern successor to react-beautiful-dnd. FLIP transitions, accessible, touch-friendly. |
| `@use-gesture/react` + `@react-spring/web` | ~15kb | A | Physics-based gestures: Tinder swipe cards, pull-to-refresh with friction curves. |

```tsx
// @use-gesture + react-spring — physics drag
import { useDrag } from '@use-gesture/react';
import { useSpring, animated } from '@react-spring/web';

function SwipeCard() {
  const [{ x, rotate }, api] = useSpring(() => ({ x: 0, rotate: 0 }));

  const bind = useDrag(({ down, movement: [mx], velocity: [vx], direction: [dx] }) => {
    const trigger = vx > 0.5; // flick threshold
    const flyOut = !down && trigger;
    api.start({
      x: flyOut ? dx * window.innerWidth : down ? mx : 0,
      rotate: mx / 10,
      config: { friction: 50, tension: down ? 800 : flyOut ? 200 : 500 },
    });
  });

  return <animated.div {...bind()} style={{ x, rotateZ: rotate }} />;
}
```

### Text Animations

| Library | Size | Tier | Notes |
|---------|------|------|-------|
| **GSAP SplitText** | 0kb (included with GSAP) | S | Best for char/word/line reveals. Adds `aria-label` for accessibility. Free since Webflow acquisition. |
| Framer Motion staggered children | 0kb (already have FM) | A | Manual `<span>` splitting. Tedious but works without GSAP. |
| react-typed / typed.js | ~4kb | B | Classic typewriter effect. Rigid, limited customization. |

```tsx
// GSAP SplitText — kinetic typography in 5 lines
useGSAP(() => {
  const split = new SplitText('.hero-title', { type: 'chars,words' });
  gsap.from(split.chars, {
    opacity: 0, y: 50, rotateX: -90,
    stagger: 0.02, duration: 0.8, ease: 'back.out(1.7)',
  });
});

// Framer Motion alternative — manual but no GSAP needed
const text = "Hello World";
<motion.div initial="hidden" animate="visible" variants={{
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
}}>
  {text.split('').map((char, i) => (
    <motion.span key={i} variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    }}>
      {char === ' ' ? '\u00A0' : char}
    </motion.span>
  ))}
</motion.div>
```

### Cursor / Pointer Effects

No library needed. Custom Framer Motion hook + spring:

```tsx
'use client';
import { motion, useMotionValue, useSpring } from 'motion/react';

function CustomCursor() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 500, damping: 28 });
  const springY = useSpring(y, { stiffness: 500, damping: 28 });

  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-50 h-4 w-4 rounded-full bg-primary"
      style={{ x: springX, y: springY, translateX: '-50%', translateY: '-50%' }}
    />
  );
}
```

### Sound + Animation Sync

**use-sound** — ~3kb (wraps Howler.js ~9kb)

By Josh W. Comeau. Pairs audio feedback with UI animations.

```tsx
import useSound from 'use-sound';
import popSfx from '/sounds/pop.mp3';
import successSfx from '/sounds/success.mp3';

function LikeButton() {
  const [play] = useSound(popSfx, { volume: 0.5 });
  const [playSuccess] = useSound(successSfx);

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onTap={() => {
        play();
        // trigger like action...
      }}
    >
      ❤️
    </motion.button>
  );
}
```

**Gotcha**: Browsers block audio playback until user interaction (`click`, `keydown`). First `play()` call must be inside a user-initiated event handler. Subsequent calls are unrestricted.

### Recommended Glue Stack

```
Toasts           →  Sonner (3kb, zero-config)
Number animation →  Number Flow (4kb, per-digit FLIP)
Skeletons        →  Tailwind CSS shimmer (0kb)
Page transitions →  next-view-transitions (<1kb) + FM template.tsx fallback
Auto-animate     →  @formkit/auto-animate (2.5kb, one ref)
Drag-and-drop    →  dnd-kit (12kb, accessible)
Text reveals     →  GSAP SplitText (free, 0kb extra)
Sound feedback   →  use-sound (3kb, nice-to-have)
```

---

## Tier 6: Architecture & Performance

### The Golden Rule

**Only animate `transform` and `opacity`** — everything else triggers CPU layout/paint reflow and will never hit 60fps consistently.

Safe to animate (compositor-only):
- `transform` (translate, scale, rotate, skew)
- `opacity`
- `filter` (blur, brightness, etc.)

Unsafe (triggers layout):
- `width`, `height`, `top`, `left`, `margin`, `padding`
- `border-radius` (triggers paint)
- `box-shadow` (triggers paint, fake it with pseudo-element opacity)

### Layer Promotion

```css
/* Promote to GPU layer — use sparingly */
.animated-element {
  will-change: transform;
}
```

**DON'T** apply `will-change` to hundreds of elements. Each promoted element gets its own GPU texture — layer explosion → VRAM crash on mobile. Apply only to elements that are actively animating, remove after animation completes.

### FLIP Technique

Use Framer Motion's `layout` prop — it handles FLIP automatically:

```tsx
// FLIP layout animation — Motion handles all the math
<motion.div layout className="grid grid-cols-3 gap-4">
  {items.map(item => (
    <motion.div key={item.id} layout transition={{ type: 'spring', stiffness: 300 }}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
// Reorder items → each card FLIP-animates to new position
```

For non-React contexts, `@formkit/auto-animate` also uses FLIP internally.

### Animation API Choice

| Scenario | Use | Why |
|----------|-----|-----|
| Hover/focus/active states | CSS transitions | Zero JS cost, compositor thread |
| Spinners, looping animations | CSS `@keyframes` | Zero JS cost, GPU composited |
| Scroll-linked effects | CSS `animation-timeline: view()` | Compositor thread, no IntersectionObserver |
| Complex sequences, timelines | GSAP (WAAPI under hood) | Timeline control, scrubbing, labels |
| Spring physics, layout morphs | Motion | React-aware, automatic FLIP, spring solver |
| WebGL, canvas, game loops | `requestAnimationFrame` | Direct frame control needed |

### React 19 / RSC Architecture

**Server Components CANNOT animate.** Push `"use client"` as far down the component tree as possible:

```tsx
// CORRECT: Thin client boundary
// app/page.tsx (Server Component — fetches data)
export default async function Page() {
  const data = await fetchData();
  return <AnimatedList items={data} />;  // ← client boundary here
}

// components/AnimatedList.tsx
'use client';
export function AnimatedList({ items }) {
  return (
    <motion.ul initial="hidden" animate="show" variants={stagger}>
      {items.map(item => <motion.li key={item.id} variants={fadeUp}>{item.name}</motion.li>)}
    </motion.ul>
  );
}

// WRONG: Marking entire page as client
'use client'; // ← kills RSC benefits for entire page
export default function Page() { ... }
```

### Suspense + Animation

Animate Suspense boundaries for smooth loading transitions:

```tsx
'use client';
import { motion, AnimatePresence } from 'motion/react';
import { Suspense } from 'react';

function AnimatedSuspense({ children, fallback }) {
  return (
    <Suspense fallback={
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {fallback}
      </motion.div>
    }>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {children}
      </motion.div>
    </Suspense>
  );
}
```

### Accessibility: useReducedMotion

**ALWAYS** respect the user's OS-level motion preference:

```tsx
import { useReducedMotion } from 'motion/react';

function AnimatedCard({ children }) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={shouldReduce ? { duration: 0 } : { duration: 0.6 }}
    >
      {children}
    </motion.div>
  );
}
```

### Next.js 15 App Router Specifics

**Route transitions**: Use `template.tsx` for Framer Motion page transitions (NOT `layout.tsx`). Templates re-render on navigation, layouts don't — so `AnimatePresence` exit animations only work in templates.

**Animated modals**: Use Parallel + Intercepting Routes, not global state:

```
app/
  @modal/
    (.)photo/[id]/
      page.tsx        ← intercepted route renders as overlay
  photo/[id]/
    page.tsx          ← direct navigation renders as full page
```

**Hydration mismatch trap**: NEVER animate based on `window.innerWidth` on initial render. The server doesn't have `window` — you'll get a hydration mismatch. Use CSS media queries or `useEffect` with a mounted state:

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
// Only use window-dependent animation values after mounted === true
```

### Common Pitfalls (with Solutions)

**1. Transform stacking context trap**

`transform` creates a new stacking context. `z-index` on children gets trapped inside. Fixed elements inside transformed parents lose their fixed positioning.

**Fix**: Use React Portals for overlays, modals, and tooltips:

```tsx
import { createPortal } from 'react-dom';

function Modal({ children }) {
  return createPortal(
    <motion.div className="fixed inset-0 z-50" {...fadeProps}>
      {children}
    </motion.div>,
    document.body
  );
}
```

**2. CLS from lazy-loaded images**

Images that load and push content down destroy Cumulative Layout Shift scores.

**Fix**: Reserve space with aspect-ratio + animate on load:

```tsx
function AnimatedImage({ src, alt, width, height }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div style={{ aspectRatio: `${width}/${height}` }}>
      <motion.div animate={{ opacity: loaded ? 1 : 0 }}>
        <Image
          src={src} alt={alt} width={width} height={height}
          onLoad={() => setLoaded(true)}
        />
      </motion.div>
    </div>
  );
}
```

**3. `backdrop-filter: blur()` kills mobile FPS**

Blur is expensive to composite on low-end GPUs.

**Fix**: During animations, use a solid semi-transparent background. Apply blur only at the final resting state:

```tsx
<motion.div
  initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
  animate={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
  // Apply blur via className after animation completes
  onAnimationComplete={() => setBlurActive(true)}
  className={blurActive ? 'backdrop-blur-sm' : ''}
/>
```

**4. Memory leaks from animation cleanup**

GSAP timelines and Motion animations can leak if not cleaned up on unmount.

**Fix**: `useGSAP` auto-handles cleanup. For manual GSAP, use `ctx.revert()`:

```tsx
// useGSAP handles cleanup automatically ✅
useGSAP(() => {
  gsap.to('.box', { x: 100 });
}, { scope: container });

// Manual cleanup if needed
useEffect(() => {
  const ctx = gsap.context(() => {
    gsap.to('.box', { x: 100 });
  }, container.current);
  return () => ctx.revert(); // kills all animations in scope
}, []);
```

### Testing Animations

**Playwright**: Set `reducedMotion: 'reduce'` in config for deterministic tests:

```ts
// playwright.config.ts
export default defineConfig({
  use: {
    reducedMotion: 'reduce',
  },
});
```

**Visual regression testing**: Inject CSS to freeze all animations before taking snapshots:

```css
/* Inject before screenshot */
*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  animation-play-state: paused !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}
```

---

## Recommended Animation Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     ANIMATION ARCHITECTURE                       │
├───────────────┬──────────────────────────────────────────────────┤
│ Layer         │ Tool                                             │
├───────────────┼──────────────────────────────────────────────────┤
│ Smooth Scroll │ Lenis (global, ~3kb)                             │
│ Scroll Story  │ GSAP ScrollTrigger + SplitText (ALL FREE)        │
│ UI Motion     │ Motion (springs, layout, AnimatePresence)        │
│ Reveals       │ CSS scroll-driven animations (zero-bundle)       │
│ Page Trans    │ View Transitions API + next-view-transitions     │
│ Components    │ Magic UI + Aceternity + Motion Primitives        │
│ Glue Layer    │ Sonner, Number Flow, AutoAnimate, dnd-kit        │
│ Polish        │ Tailwind transitions + CSS @keyframes            │
│ Sound         │ use-sound (optional, nice-to-have)               │
│ Accessibility │ useReducedMotion + prefers-reduced-motion CSS    │
└───────────────┴──────────────────────────────────────────────────┘
```

### Why This Stack Wins at Judging

1. **Lenis**: Butter-smooth scroll → instant "premium feel" signal to judges
2. **GSAP SplitText + ScrollTrigger**: Kinetic typography + pinned scroll sections → "wow" storytelling for demo
3. **Motion**: Every button, modal, and list feels alive with spring physics
4. **CSS native scroll animations**: Zero JS cost for simple reveals (parallax, fade-up cards)
5. **View Transitions**: Seamless page-to-page morphing without SPA complexity
6. **Magic UI / Aceternity**: Copy-paste hero sections, shimmer buttons, animated beams → 10 minutes of work for "how did you build that?!" reactions
7. **Sonner + Number Flow**: Toasts and counters that feel native-app quality
8. **AutoAnimate**: Dynamic lists animate automatically with one ref

### Bundle Size Budget

| Tool                                  | Size   |
| ------------------------------------- | -----  |
| Motion (lazy)                         | ~15kb  |
| GSAP core + ScrollTrigger + SplitText | ~30kb  |
| Lenis                                 | ~3kb   |
| Sonner                                | ~3kb   |
| Number Flow                           | ~4kb   |
| AutoAnimate                           | ~2.5kb |
| next-view-transitions                 | <1kb   |
| dnd-kit (if needed)                   | ~12kb  |
| use-sound + Howler (if needed)        | ~12kb  |
| CSS native APIs                       | 0kb    |
| **Core total (without optionals)**    | **~58.5kb** |
| **Full total (with all optionals)**   | **~82.5kb** |

### What NOT to Waste Time On

- ❌ Three.js/R3F for a non-3D project (massive bundle, steep learning curve)
- ❌ Locomotive Scroll (Lenis replaced it)
- ❌ Custom spring physics from scratch (Motion handles this)
- ❌ react-loading-skeleton when you have Tailwind (CSS shimmer is better and free)
- ❌ notistack (14kb, MUI-coupled — Sonner is 3kb and better)
- ❌ React Spring standalone (Motion has absorbed its niche with better DX)
- ❌ Raw D3 for simple charts (use Recharts via shadcn/ui)
- ❌ Building custom drag-and-drop (dnd-kit exists)
- ❌ `react-transition-group` (legacy, Motion does everything it does + more)

---

## Package Installation (One-Shot)

```bash
# Core animation stack
npm install motion gsap @gsap/react lenis @studio-freight/react-lenis

# Glue layer
npm install sonner @number-flow/react @formkit/auto-animate next-view-transitions

# Optional — gesture/drag
npm install @dnd-kit/core @dnd-kit/sortable

# Optional — sound feedback
npm install use-sound

# Optional — lightweight GSAP alternative
npm install animejs

# Pre-built components (copy-paste via CLI, no npm dep)
npx magicui-cli add shimmer-button marquee number-ticker bento-grid border-beam

# CSS polyfill (optional, for Firefox scroll-driven animations)
npm install scroll-timeline

# REQUIRED utility for all component libraries
npm install clsx tailwind-merge
```
