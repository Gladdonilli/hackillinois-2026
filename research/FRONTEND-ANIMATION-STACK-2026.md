# Frontend Animation Stack for HackIllinois 2026

A reference for the React/Next.js 15 animation stack. Opinionated, practical, and built for a 36-hour hackathon where every minute counts. Grab the right tool, copy the snippet, ship.


## 1. The Two Pillars

Two engines. Everything else is a complement.

### Motion (formerly Framer Motion)

The default for React UI animation. Hybrid WAAPI engine, ~15kb lazy-loaded. Covers 80% of what you'll need without thinking about it.

What it gives you: `whileInView`, `AnimatePresence`, `layoutId`, spring physics, gesture handlers, shared layout animations. It wraps the Web Animations API under the hood but falls back gracefully.

```tsx
import { motion, AnimatePresence } from "motion/react";

function Card({ item }: { item: Item }) {
  return (
    <motion.div
      layout
      layoutId={item.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {item.title}
    </motion.div>
  );
}

function List({ items }: { items: Item[] }) {
  return (
    <AnimatePresence mode="popLayout">
      {items.map((item) => (
        <Card key={item.id} item={item} />
      ))}
    </AnimatePresence>
  );
}
```

The `layout` prop handles FLIP calculations automatically. When `items` reorder, every card animates to its new position. `AnimatePresence` handles exit animations, which React alone can't do because unmounted components are gone from the tree.

**React 19 `<ViewTransition>` component**: React 19 ships a native `<ViewTransition>` component that eliminates the old `document.startViewTransition()` + `flushSync` coordination dance. For cross-route morphing (avatar moving from list to detail page), this is now the simplest path. Motion still wins for intra-page animation, gestures, and spring physics. Use both.

```tsx
// React 19 native view transitions
import { unstable_ViewTransition as ViewTransition } from "react";

function ProfileCard({ user }: { user: User }) {
  return (
    <ViewTransition name={`profile-${user.id}`}>
      <img src={user.avatar} alt={user.name} />
    </ViewTransition>
  );
}
```

### GSAP 3.14

The scroll storytelling engine. ALL premium plugins are now free after the Webflow acquisition (mid-2025). That means ScrollTrigger, SplitText, ScrollSmoother, MorphSVG, DrawSVG, and Flip are zero-cost. This is a huge deal.

Use `@gsap/react` for the `useGSAP` hook, which handles cleanup automatically (no more leaked tweens).

```tsx
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

function ScrollSection() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".reveal", {
        y: 60,
        opacity: 0,
        stagger: 0.15,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: container.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: container }
  );

  return (
    <div ref={container}>
      <h2 className="reveal">Section Title</h2>
      <p className="reveal">Body text animates in on scroll.</p>
    </div>
  );
}
```

`useGSAP` scopes all selectors to the container ref and kills tweens on unmount. Without it, you're manually cleaning up in `useEffect` return callbacks and it's easy to leak.

**GSAP SplitText** is now free too. Best char/word/line reveal engine available. Automatically adds `aria-label` to preserve accessibility.

```tsx
useGSAP(() => {
  const split = new SplitText(".hero-title", { type: "chars,words" });
  gsap.from(split.chars, {
    opacity: 0,
    y: 30,
    rotateX: -40,
    stagger: 0.03,
    duration: 0.6,
    ease: "back.out(1.7)",
  });
}, { scope: container });
```

**Anime.js v4**: lightweight alternative to GSAP at ~3kb. Completely rewritten in TypeScript with a WAAPI engine. If you don't need ScrollTrigger or SplitText, Anime v4 covers sequencing and staggering at a fraction of the bundle. 50k+ GitHub stars.

```ts
import { waapi, stagger, splitText } from "animejs";

// WAAPI engine for hardware-accelerated animation
waapi.animate(".card", {
  translateY: [20, 0],
  opacity: [0, 1],
  delay: stagger(80),
  duration: 500,
  easing: "outExpo",
});

// Built-in text splitting
const { chars } = splitText(".hero-title");
waapi.animate(chars, {
  opacity: [0, 1],
  translateY: [20, 0],
  delay: stagger(30),
});
```

Pick one. GSAP if you need scroll-driven anything. Anime v4 if you want smaller bundles and simpler sequences.


## 2. Native Browser APIs

Zero-bundle animations. The browser does the work.

### CSS Scroll-Driven Animations

No JavaScript. No library. The `animation-timeline: view()` property ties any CSS animation to an element's scroll position. Chrome and Safari have full support as of early 2026. Firefox is behind but catching up.

```css
.fade-up {
  animation: fadeUp linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

That's it. No IntersectionObserver, no scroll listener, no JavaScript at all. The element fades up as it enters the viewport. `animation-range` controls when the animation starts and ends relative to the element's visibility.

Good for: reveal-on-scroll effects, parallax-lite, progress bars tied to scroll position. Not good for: complex sequenced animations or anything that needs JavaScript control. That's where GSAP ScrollTrigger takes over.

### View Transitions API

Cross-page morphing built into the browser. An element with a `view-transition-name` will interpolate its position, size, and appearance between two page states.

The raw API requires `document.startViewTransition()` + `flushSync`, which is awkward in React. Two better options in 2026:

**Option A: React 19 `<ViewTransition>` (recommended)**

```tsx
import { unstable_ViewTransition as ViewTransition } from "react";

// Wrap any element that should morph across state changes
<ViewTransition name="hero-image">
  <img src={selectedImage} className="w-full rounded-lg" />
</ViewTransition>
```

React handles the `startViewTransition` coordination internally. No `flushSync`, no manual callbacks.

**Option B: `next-view-transitions` package (<1kb)**

For Next.js App Router, this package wraps the View Transitions API with route-change detection:

```tsx
// app/layout.tsx
import { ViewTransitions } from "next-view-transitions";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransitions>
      <html>
        <body>{children}</body>
      </html>
    </ViewTransitions>
  );
}

// Any page component
import { Link } from "next-view-transitions";

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`}>
      <img
        src={product.image}
        style={{ viewTransitionName: `product-${product.id}` }}
      />
    </Link>
  );
}
```

The image morphs from its position in the list to its position on the detail page. Under 1kb. Safari support landed in 2025.


## 3. Smooth Scroll

### Lenis

~3kb. Replaced Locomotive Scroll as the standard smooth-scroll library. Normalizes scroll velocity across browsers and input devices (trackpad, mouse wheel, touch).

```tsx
"use client";

import { ReactLenis } from "lenis/react";

export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
```

Wrap your layout. Done. Lenis plays nicely with GSAP ScrollTrigger, just call `ScrollTrigger.refresh()` if you dynamically add content.

Only add Lenis if your project has scroll-driven storytelling. For a standard dashboard or CRUD app, native scroll is fine. Don't add smooth scroll "because it looks nice" and then fight it for 3 hours when dropdowns and modals break.


## 4. Pre-Built Animated Component Libraries

The shadcn/ui pattern: copy-paste components into your project, own the code, customize freely. These libraries give you polished animated components without locking you into a dependency.

### Magic UI

**URL**: magicui.design
**Stars**: ~20.2k | **License**: MIT | **Components**: 150+
**Framework**: React, Tailwind CSS | **Tailwind**: native | **Dark mode**: yes
**Accessibility**: varies per component | **Install**: CLI (`npx magicui-cli add <component>`)

The biggest collection. Strongest in landing page components, data visualization, and decorative backgrounds.

Standout components:
- **Globe** -- interactive 3D globe for "users worldwide" sections, WebGL-based
- **Bento Grid** -- responsive grid with animated hover states, the 2025-2026 layout pattern
- **Retro Grid / Ripple** -- decorative background effects, pure CSS + minimal JS
- **Border Beam** -- animated gradient border that traces the edge of a card
- **Marquee** -- infinite scrolling text/logos, classic social proof

Gotchas: Some components have heavy dependencies (Three.js for Globe). Check the import before dropping it in. The CLI makes it easy to audit.

### Aceternity UI

**URL**: ui.aceternity.com
**Stars**: ~10k+ | **License**: MIT | **Components**: 70+
**Framework**: React, Tailwind CSS, some need Three.js | **Dark mode**: yes
**Accessibility**: inconsistent | **Install**: copy-paste from docs

Complex set-pieces. These are the "wow" components for hero sections and landing pages. Higher effort to customize, but the visual impact is unmatched.

Standout components:
- **3D Pin / 3D Card** -- perspective transforms on hover, parallax layers
- **Background Beams / Sparkles** -- full-screen particle effects
- **Macbook Scroll** -- product mockup that scrolls open as user scrolls down
- **Text Hover Effects** -- character-level interactions on hover
- **Spotlight** -- follows cursor, illuminates content

**GOTCHA: bundle size**. Components that use Three.js (3D Card Stack, Vortex, Globe) pull in ~150kb+ of Three.js. If you only need one Three.js component, it's worth it. If you need zero 3D, avoid those components entirely. Audit imports.

### Motion Primitives

**URL**: motion-primitives.com (by Ibelick)
**License**: MIT | **Components**: ~40
**Framework**: React, Motion | **Tailwind**: native | **Dark mode**: yes
**Accessibility**: good | **Install**: copy-paste

The best library for app UI micro-interactions (not landing pages). These feel like production components, not demos.

Standout components:
- **Morphing Dialogs** -- button morphs into dialog using shared layout animation
- **Animated Tabs** -- sliding indicator with content crossfade
- **Text Scramble** -- character-by-character reveal with randomized intermediate states
- **Accordion** -- smooth height animation without hardcoded heights

Use these for your actual app interface. They're subtle, performant, and won't distract from your content.

### Animata

**URL**: animata.design
**Stars**: ~2k | **License**: MIT | **Components**: 80+
**Framework**: React, Tailwind CSS | **Dark mode**: yes
**Accessibility**: basic | **Install**: copy-paste

Creative interaction patterns. Stronger on hover effects and organic/physics-inspired animations.

Standout components:
- **Direction Aware Hover** -- overlay slides in from the direction the cursor entered
- **Liquid / Gooey Effects** -- SVG filter-based organic blob animations
- **Magnetic Buttons** -- button follows cursor within a radius, snaps back on leave
- **Stacked Cards** -- deck of cards that fan out on hover

**GOTCHA**: Some components use complex Tailwind arbitrary values (`[mask-image:radial-gradient(...)]`) that can be brittle. Test in your actual Tailwind config before committing to one.

### Cult UI

**URL**: cult-ui.com
**License**: MIT | **Components**: ~30
**Framework**: React, Radix UI | **Tailwind**: native | **Dark mode**: yes
**Accessibility**: VERY HIGH (Radix primitives) | **Install**: copy-paste

The accessibility-first option. Built on Radix UI primitives, so keyboard navigation, screen readers, and focus management work out of the box. Small collection, but every component is production-grade.

Standout components:
- **Animated Navigation Menus** -- smooth dropdowns with content transitions
- **Dynamic Inputs** -- input fields that morph between states (search, filter, command)
- **Expandable Cards** -- smooth height transitions with Radix Collapsible

Pick this when you're building a real app interface and judges might test keyboard navigation.

### Syntax UI

**URL**: syntaxui.com
**Stars**: ~1k | **License**: MIT | **Components**: ~50
**Framework**: React, Tailwind CSS | **Dark mode**: yes
**Accessibility**: basic | **Install**: copy-paste

Focus on page blocks rather than individual components. Good for assembling landing pages quickly.

Standout components:
- **Pricing Tables** -- animated comparison cards with toggle
- **Testimonial Carousels** -- auto-rotating with crossfade
- **Feature Grids** -- icon + text blocks with staggered reveal
- **CTA Sections** -- gradient backgrounds with animated text

Use it for your marketing/landing page. Less useful for app UI.

### Eldora UI

**URL**: eldoraui.site
**License**: MIT | **Components**: 100+
**Framework**: React, Tailwind CSS | **Dark mode**: yes
**Accessibility**: varies | **Install**: copy-paste

Large collection with strength in full-page sections rather than isolated components.

Standout components:
- **Bento Grids** -- multiple variants with different animation styles
- **Hero Sections** -- gradient text, particle backgrounds, typed text combos
- **Feature Sections** -- icon grids with scroll-triggered reveals
- **Footers** -- animated link groups and newsletter inputs

### Fancy Components

**URL**: fancycomponents.dev
**License**: MIT | **Components**: ~25
**Framework**: React | **Dark mode**: yes
**Accessibility**: minimal | **Install**: copy-paste

Stylized and edgy. These push past "clean and professional" into "memorable and weird." Good for creative/artistic projects.

Standout components:
- **Float / Hover Physics** -- elements float with physics simulation, react to cursor
- **Glitch Text** -- CRT/VHS style text distortion
- **Noise Backgrounds** -- SVG noise filters for texture
- **Distortion Hover** -- image warps on cursor proximity

### HextaUI

**Stars**: 500+ | **License**: MIT
**Framework**: React, GSAP + Motion | **Tailwind**: native

Foundation blocks for common app patterns, not isolated components.

Standout components:
- **Auth Screens** -- login/signup with animated transitions between states
- **AI Chat Interfaces** -- streaming text with typing indicators
- **Dashboard Layouts** -- sidebar collapse, panel transitions
- **Data Tables** -- sortable with row animation

### Lukacho UI

**License**: MIT | **Framework**: React, Tailwind CSS

Minimalist, refined. Small collection but every piece is polished.

Standout components:
- **Custom Cursors** -- cursor transforms based on hover target
- **Animated Charts** -- bar/line charts with draw-on animations
- **Premium Tabs** -- underline/pill indicator with spring physics

### Ibelick UI

**URL**: ui.ibelick.com
**License**: MIT | **Framework**: React, Tailwind CSS

Specialized for dark mode AI interfaces. If you're building anything that looks like a ChatGPT/Claude interface, start here.

Standout components:
- **Glowing Borders** -- animated gradient borders for cards and inputs
- **AI Generation Loaders** -- shimmer + pulse patterns for "thinking" states
- **Dark Gradient Backgrounds** -- mesh gradients, aurora effects
- **Text Streaming** -- character-by-character text reveal for AI responses

### Hackathon Strategy

Don't try to use all of these. Here's the decision tree:

**Core UI**: shadcn/ui. Always. It's your foundation.

**App micro-interactions**: Motion Primitives + Cult UI. These give you real app components (tabs, dialogs, accordions) with animation baked in and accessibility handled.

**AI interface** (if applicable): Ibelick UI for the dark-mode AI aesthetic. Pair with HextaUI's chat interface blocks.

**Landing page / demo page**: Magic UI for bento grids and social proof. Aceternity UI for one hero background effect (pick ONE, don't stack three).

**Scroll narrative** (if your demo tells a story): GSAP ScrollTrigger. Nothing else comes close for sequenced scroll-driven animation.

**Hour 1 priority**: Set up the `cn()` utility. Every single one of these libraries depends on it for className merging. If you skip this, you'll waste 30 minutes debugging why classes don't apply.

```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```bash
npm install clsx tailwind-merge
```


## 5. The Glue Layer: Micro-Interactions and Utilities

The stuff between the big animations. Toast notifications, loading states, number transitions, drag-and-drop. Small libraries that make an app feel polished instead of "it works but it feels like a hackathon project."

### Toast / Notifications

**Sonner** (`sonner`)
~3kb | S-Tier

The toast library for 2026. Stacked Vercel-style toasts, 60fps WAAPI animations, swipe-to-dismiss on mobile. Drop in the `<Toaster />` component and call `toast()` anywhere.

```tsx
// app/layout.tsx
import { Toaster } from "sonner";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}

// anywhere in your app
import { toast } from "sonner";

function handleSubmit() {
  toast.promise(submitForm(), {
    loading: "Saving...",
    success: "Saved successfully",
    error: "Something went wrong",
  });
}
```

**react-hot-toast**
~5kb | A-Tier

The previous king. Still works great but hasn't evolved much. Defaults look slightly dated compared to Sonner. Use it if you're already familiar with it, but for new projects, Sonner wins.

**notistack**
~14kb | Avoid

Only reach for it if you're deep in MUI. Too heavy otherwise.

### Number / Counter Animations

**Number Flow** (`@number-flow/react`)
~4kb | S-Tier

Per-digit animation using `Intl.NumberFormat`. Each digit slides independently to its new value. No state thrashing, no counter that ticks through every intermediate number.

```tsx
import NumberFlow from "@number-flow/react";

function PriceDisplay({ price }: { price: number }) {
  return (
    <NumberFlow
      value={price}
      format={{ style: "currency", currency: "USD" }}
      transformTiming={{ duration: 500, easing: "ease-out" }}
    />
  );
}
```

When `price` changes from 29.99 to 149.99, each digit morphs individually. The `1` slides in, the `2` becomes `4`, the first `9` stays. It looks incredible on dashboards and pricing pages.

**react-countup**
~6kb | B-Tier

Good for "0 to 10,000 on scroll" hero stats. Bad for live-updating data because it replays the full count animation on every change.

### Loading / Skeletons

**Tailwind shimmer** (no library)
0kb | S-Tier

Don't install a skeleton library in 2026. Tailwind's `animate-pulse` covers 90% of cases. For a nicer shimmer effect, use a custom pseudo-element:

```css
/* globals.css */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  @apply bg-gradient-to-r from-muted via-muted/50 to-muted;
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

```tsx
function CardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="skeleton h-48 w-full rounded-lg" />
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="skeleton h-4 w-1/2 rounded" />
    </div>
  );
}
```

**react-loading-skeleton** (~3kb, B-Tier): fine if you're not using Tailwind. **react-content-loader** (~2kb, B-Tier): SVG-based, good for complex custom shapes like a Facebook post skeleton.

### Page / Route Transitions

**next-view-transitions**
<1kb | S-Tier

Already covered in Section 2, but worth repeating here: this is the easiest way to get page transition morphing in Next.js App Router. Add the `<ViewTransitions>` wrapper, use `view-transition-name` CSS properties on elements that should morph, done.

**Framer Motion `template.tsx` pattern (Safari fallback)**:

Safari's View Transitions support is solid now, but if you need a bulletproof fallback:

```tsx
// app/template.tsx
"use client";

import { motion } from "motion/react";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

`template.tsx` re-mounts on every route change (unlike `layout.tsx`), so the animation replays naturally. The outgoing page gets the new route's data but the animation wrapper re-triggers.

### Auto-Animate

**@formkit/auto-animate**
~2.5kb | S-Tier

One ref. Zero config. MutationObserver detects DOM changes, FLIP calculates positions, WAAPI animates the transition. Lists reorder, items appear and disappear, all animated automatically.

```tsx
import { useAutoAnimate } from "@formkit/auto-animate/react";

function TodoList({ items }: { items: Todo[] }) {
  const [parent] = useAutoAnimate();

  return (
    <ul ref={parent}>
      {items.map((item) => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  );
}
```

Add an item, remove an item, reorder items, and they all animate. No configuration, no variants, no exit callbacks. Just the ref.

**Limitation**: struggles when elements change `display` type (e.g., `block` to `none` or `flex` to `grid`). For those cases, use Motion's `AnimatePresence` instead. Auto-animate is best for simple list mutations.

### Gesture / Drag

**dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`)
~12kb | S-Tier

Modern successor to react-beautiful-dnd (which is unmaintained). FLIP-based transitions, accessible by default, works with keyboard and screen readers.

```tsx
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function SortableList({ items, onReorder }: Props) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id, over.id);
    }
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItem key={item.id} id={item.id}>
            {item.content}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

**@use-gesture/react + @react-spring/web**
~15kb | A-Tier

Physics-based gesture handling. Tinder-style swipe cards, pull-to-refresh with friction curves, pinch-to-zoom. The combination gives you gesture recognition (use-gesture) paired with spring physics (react-spring).

```tsx
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

function SwipeCard({ onSwipe, children }: Props) {
  const [{ x, rotate, opacity }, api] = useSpring(() => ({
    x: 0,
    rotate: 0,
    opacity: 1,
  }));

  const bind = useDrag(
    ({ active, movement: [mx], direction: [dx], velocity: [vx] }) => {
      const trigger = vx > 0.2;
      const flyOut = !active && trigger;

      api.start({
        x: flyOut ? dx * window.innerWidth : active ? mx : 0,
        rotate: flyOut ? dx * 45 : mx / 15,
        opacity: flyOut ? 0 : 1,
        config: { friction: 50, tension: active ? 800 : flyOut ? 200 : 500 },
        onRest: flyOut ? () => onSwipe(dx > 0 ? "right" : "left") : undefined,
      });
    }
  );

  return (
    <animated.div
      {...bind()}
      style={{ x, rotateZ: rotate, opacity, touchAction: "none" }}
    >
      {children}
    </animated.div>
  );
}
```

### Text Animations

**GSAP SplitText** -- best in class for character/word/line reveals. Free since the Webflow acquisition. Adds `aria-label` automatically so screen readers still read the full text. Covered in Section 1.

**Motion staggered children** -- manual approach, no extra dependency:

```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const letter = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function AnimatedText({ text }: { text: string }) {
  return (
    <motion.span variants={container} initial="hidden" animate="show">
      {text.split("").map((char, i) => (
        <motion.span key={i} variants={letter} className="inline-block">
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.span>
  );
}
```

Tedious compared to SplitText, but works without adding GSAP to your bundle.

**react-typed / typed.js** (~4kb) -- classic typewriter effect. Rigid timing, limited customization. Fine for a hero subtitle but nothing else.

### Cursor / Pointer Effects

No library needed. A Motion spring + pointer tracking hook covers it:

```tsx
"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect } from "react";

function CustomCursor() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 300, damping: 28 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 28 });

  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const handleMove = (e: PointerEvent) => {
      mouseX.set(e.clientX - 16);
      mouseY.set(e.clientY - 16);
    };

    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-50 h-8 w-8 rounded-full border-2 border-white mix-blend-difference"
      style={{ x: springX, y: springY }}
    />
  );
}
```

The spring creates a trailing effect. `pointer: coarse` media query disables it on phones and tablets where a custom cursor is meaningless. `mix-blend-difference` makes it visible on any background.

### Sound + Animation Sync

**use-sound** (`use-sound`)
~3kb (wraps Howler ~9kb)

By Josh W. Comeau. Pairs audio feedback with UI interactions. A subtle "pop" on a button press, a whoosh on a swipe, a ding on a notification.

```tsx
import useSound from "use-sound";

function LikeButton() {
  const [play] = useSound("/sounds/pop.mp3", { volume: 0.5 });

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => {
        play();
        // handle like logic
      }}
    >
      Like
    </motion.button>
  );
}
```

**GOTCHA**: browsers block audio until the user has interacted with the page (click, tap, keypress). Don't try to play sound on page load. The first sound trigger must be user-initiated. Howler handles the AudioContext resume automatically after that first interaction.

Add sounds sparingly. One or two well-placed audio cues make a demo memorable. Sound on every click makes judges mute your tab.


## 6. Architecture and Performance

The difference between "animations work on my laptop" and "animations work on the judge's phone."

### Performance Patterns

**Only animate `transform` and `opacity`**. Everything else (width, height, top, left, padding, margin, border-radius) triggers CPU layout reflow. This is the single most impactful performance rule.

```css
/* BAD - triggers layout + paint */
.animate-bad {
  transition: width 0.3s, height 0.3s, left 0.3s;
}

/* GOOD - compositor only */
.animate-good {
  transition: transform 0.3s, opacity 0.3s;
}
```

**`will-change: transform`** promotes an element to its own GPU layer. Use it on elements that will animate. Do NOT apply it to hundreds of elements. Each promoted layer consumes GPU VRAM. On mobile, promoting 50+ elements can cause a layer explosion that crashes the compositor.

```css
/* Good: specific, limited scope */
.card-animate { will-change: transform; }

/* Bad: applied to everything */
* { will-change: transform, opacity; }
```

**FLIP technique**: First, Last, Invert, Play. Measures element position before and after a DOM change, then animates the inversion. Motion's `layout` prop does this automatically:

```tsx
// Motion handles FLIP internally when you use layout
function ExpandableCard({ isOpen }: { isOpen: boolean }) {
  return (
    <motion.div
      layout
      style={{
        width: isOpen ? 400 : 200,
        height: isOpen ? 300 : 100,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <motion.h3 layout="position">Card Title</motion.h3>
      {isOpen && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          Expanded content appears after the resize animation.
        </motion.p>
      )}
    </motion.div>
  );
}
```

`layout="position"` on the title means it only animates its position change, not its size. The paragraph fades in with a slight delay so it doesn't compete with the resize.

**API choice by use case**:

| Use case | Best API |
|----------|----------|
| Hover states, spinners | CSS transitions |
| Simple scroll reveals | CSS `animation-timeline: view()` |
| Complex scroll sequences | GSAP ScrollTrigger |
| UI component animation | Motion (React) |
| Coordinated multi-element sequences | GSAP timeline or Anime.js v4 |
| Physics / WebGL | requestAnimationFrame |

### React 19 Architecture

**RSCs cannot animate**. Server Components don't run in the browser, so they can't access DOM APIs, refs, or any animation library. Push the `'use client'` boundary as far down as possible:

```tsx
// app/page.tsx (Server Component - no animation)
import { AnimatedSection } from "./animated-section";

export default async function Page() {
  const data = await fetchData(); // runs on server
  return (
    <main>
      <h1>{data.title}</h1>
      <AnimatedSection items={data.items} /> {/* client boundary */}
    </main>
  );
}

// app/animated-section.tsx
"use client";
import { motion } from "motion/react";

export function AnimatedSection({ items }: { items: Item[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {items.map((item) => (
        <motion.div key={item.id} layout>
          {item.name}
        </motion.div>
      ))}
    </motion.div>
  );
}
```

The server fetches data. The client animates the presentation. Keep the boundary tight.

**Suspense + animation**: Animate the fallback exit and the content entry:

```tsx
"use client";

import { Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";

function AnimatedSuspense({
  fallback,
  children,
}: {
  fallback: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          {fallback}
        </motion.div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {children}
      </motion.div>
    </Suspense>
  );
}
```

**`useReducedMotion` hook**: Always respect OS accessibility preferences. Some users enable "Reduce motion" because animations cause nausea or seizures. This is not optional.

```tsx
import { useReducedMotion } from "motion/react";

function AnimatedCard({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 300, damping: 30 }
      }
    >
      {children}
    </motion.div>
  );
}
```

When reduced motion is on, skip movement animations entirely and just crossfade. Motion's `useReducedMotion` reads `prefers-reduced-motion` from the OS.

### Next.js 15 App Router

**Route transitions**: Use `template.tsx` with Motion. `template.tsx` re-mounts on every route change, unlike `layout.tsx` which persists. This means animation `initial` states re-trigger naturally.

**Parallel + Intercepting Routes for animated modals**: Don't use global state for modals. Next.js intercepting routes let you show a modal on the current page while giving the modal its own URL:

```
app/
  @modal/
    (.)photo/[id]/
      page.tsx        <- intercepted route, renders as modal
  photo/[id]/
    page.tsx          <- direct route, renders as full page
  layout.tsx          <- renders {children} + {modal}
```

The modal slides in with Motion. If the user shares the URL, they get the full page. No global state, no context providers, no state sync bugs.

**Streaming SSR hydration pitfall**: Don't animate based on `window.innerWidth` or any browser API during the first render. The server doesn't have a window, so the SSR HTML won't match the hydrated client HTML. Move dimension-based logic into a `useEffect` or use CSS media queries for responsive animation.

### Common Pitfalls (with solutions)

**1. `transform` stacking context trap**

Any element with `transform` creates a new stacking context. Modals, tooltips, and dropdown menus inside a transformed parent will be clipped or layered incorrectly.

Solution: use React Portals for overlays.

```tsx
import { createPortal } from "react-dom";

function Tooltip({ children, content }: Props) {
  const [show, setShow] = useState(false);

  return (
    <>
      <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
      </div>
      {show &&
        createPortal(
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed z-50 rounded bg-gray-900 px-3 py-1.5 text-sm text-white"
          >
            {content}
          </motion.div>,
          document.body
        )}
    </>
  );
}
```

**2. CLS from lazy images**

Cumulative Layout Shift. Images load and push content down. Judges notice.

```tsx
import Image from "next/image";
import { motion } from "motion/react";
import { useState } from "react";

function AnimatedImage({ src, alt, width, height }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative" style={{ aspectRatio: `${width}/${height}` }}>
      {!loaded && <div className="skeleton absolute inset-0 rounded-lg" />}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          onLoad={() => setLoaded(true)}
          className="rounded-lg"
        />
      </motion.div>
    </div>
  );
}
```

The `aspectRatio` reserves space before the image loads. The skeleton shows during loading. The image fades in. Zero layout shift.

**3. `backdrop-filter: blur()` kills mobile FPS**

Backdrop blur is GPU-intensive. Animating the blur value or animating elements behind a blurred overlay will drop frames on phones.

Solution: fade in a solid (slightly transparent) background during animation. Only apply the blur at the final resting state:

```css
.overlay-entering {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: none;           /* no blur during animation */
}

.overlay-entered {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);     /* blur only at rest */
  transition: backdrop-filter 0.3s ease;
}
```

**4. Memory leaks from animation cleanup**

GSAP tweens keep running after a component unmounts unless you kill them. Motion handles cleanup automatically, but GSAP needs explicit management.

```tsx
// BAD - leaked tween
useEffect(() => {
  gsap.to(".box", { x: 100, duration: 2 });
}, []);

// GOOD - useGSAP auto-cleanup
useGSAP(() => {
  gsap.to(".box", { x: 100, duration: 2 });
}, { scope: containerRef });
```

`useGSAP` registers all tweens in the scope and kills them when the component unmounts. Always use it instead of raw `useEffect` + GSAP.

### Testing Animations

**Playwright**: Set `reducedMotion: 'reduce'` in your config for deterministic tests. Animations complete instantly, so assertions don't time out waiting for transitions.

```ts
// playwright.config.ts
export default defineConfig({
  use: {
    reducedMotion: "reduce",
  },
});
```

**Visual regression testing**: Inject CSS that pauses all animations before taking snapshots:

```css
/* test-utils/pause-animations.css */
*,
*::before,
*::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}
```

Inject this stylesheet at the start of your test suite. All snapshots capture the final state, not a mid-animation frame.


## 7. Recommended Architecture

Where everything fits:

```
+------------------------------------------------------------------+
|                        Next.js 15 App Router                      |
|                                                                    |
|  Server Components (RSC)          Client Components ('use client') |
|  +-------------------------+     +---------------------------------+
|  | Data fetching            |     | Animation orchestration         |
|  | Static content           |     | Motion / AnimatePresence        |
|  | SEO metadata             |     | GSAP useGSAP()                  |
|  | Layout structure         |     | Gesture handlers                |
|  +-------------------------+     | Sound triggers                  |
|                                   +---------------------------------+
|                                                                    |
+------------------------------------------------------------------+
|                         Rendering Layer                            |
|  CSS Scroll-Driven    View Transitions API    Motion layout       |
|  (zero-bundle          (cross-page morph)      (intra-page FLIP)  |
|   scroll reveals)                                                  |
+------------------------------------------------------------------+
|                         Component Layer                            |
|  shadcn/ui (base)  →  Magic UI / Aceternity (landing)             |
|                    →  Motion Primitives / Cult UI (app UI)        |
|                    →  Ibelick UI (AI interfaces)                  |
+------------------------------------------------------------------+
|                         Glue Layer                                 |
|  Sonner (toast)    Number Flow (counters)    auto-animate (lists) |
|  dnd-kit (drag)    use-sound (audio)         Lenis (smooth scroll)|
+------------------------------------------------------------------+
|                         Performance                                |
|  transform + opacity only    will-change (targeted)               |
|  useReducedMotion            Portals for overlays                 |
|  template.tsx transitions    aspect-ratio CLS prevention          |
+------------------------------------------------------------------+
```

Data flows down from Server Components. Animation happens at the client boundary. The component layer provides pre-built pieces. The glue layer connects interactions. Performance rules apply everywhere.


## 8. Bundle Size Budget

Keep total animation dependencies under 60kb gzipped. Here's the recommended stack and what each piece costs:

| Package | Size (gzip) | Purpose | Required? |
|---------|-------------|---------|-----------|
| `motion` | ~15kb (lazy) | UI animation engine | Yes |
| `gsap` + `@gsap/react` | ~23kb | Scroll narratives, SplitText | If scroll-driven |
| `lenis` | ~3kb | Smooth scroll | If scroll-driven |
| `sonner` | ~3kb | Toast notifications | Yes |
| `@number-flow/react` | ~4kb | Number animations | If dashboards |
| `@formkit/auto-animate` | ~2.5kb | List animations | Recommended |
| `next-view-transitions` | <1kb | Page transitions | Recommended |
| `@dnd-kit/core` + `sortable` | ~12kb | Drag and drop | If needed |
| `use-sound` + howler | ~12kb | Audio feedback | If demo wow-factor |
| `@use-gesture/react` | ~8kb | Physics gestures | If Tinder-style UI |
| `@react-spring/web` | ~7kb | Spring physics | Pairs with gesture |
| `clsx` + `tailwind-merge` | ~1.5kb | className utility | Yes |
| CSS Scroll-Driven | 0kb | Scroll reveals | Use freely |
| View Transitions API | 0kb | Page morphs | Use freely |

**Recommended baseline** (covers 90% of needs):
Motion + Sonner + auto-animate + next-view-transitions + clsx/tw-merge = **~25kb**

**Full stack** (everything including scroll narrative and drag):
Add GSAP + Lenis + dnd-kit = **~63kb**

That leaves room in a typical 200kb JS budget for your actual app logic, React itself, and UI components.


## 9. What NOT to Waste Time On

Things that sound cool but will eat your 36 hours alive:

- **Three.js / React Three Fiber**: Unless 3D IS your project, don't start a 3D scene for a background effect. Use Aceternity's pre-built 3D components if you need a "wow" moment. Rolling your own loading pipeline, camera rig, and lighting setup is a 4-hour detour minimum.

- **Lottie**: JSON animation files from After Effects. The toolchain is heavy (After Effects + Bodymovin plugin + runtime). The React wrapper is another dependency. Motion and GSAP can do everything Lottie does for UI animation, with smaller bundles and more control.

- **Custom physics engines**: Matter.js, Cannon.js. Unless your project IS a physics simulation, don't build gravity for a dropdown menu.

- **CSS Houdini / Paint Worklets**: Experimental, inconsistent browser support, debugging is painful. Not worth it for a hackathon.

- **Particle libraries** (tsParticles, particles.js): Heavy, hard to configure, and the "floating dots background" trend peaked in 2022. Use a CSS gradient or Aceternity's pre-built background if you want ambient motion.

- **Overanimating**: The biggest trap. Not everything needs to move. If your app feels like a slot machine, dial it back. The best demos have 3-4 signature animations and let the rest of the UI breathe.


## 10. Package Installation

One command to get started. Pick the set that matches your project:

**Baseline (every project)**:
```bash
npm install motion sonner @formkit/auto-animate next-view-transitions clsx tailwind-merge
```

**Add scroll storytelling**:
```bash
npm install gsap @gsap/react lenis
```

**Add drag-and-drop**:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Add number animations**:
```bash
npm install @number-flow/react
```

**Add sound effects**:
```bash
npm install use-sound
```

**Add physics gestures**:
```bash
npm install @use-gesture/react @react-spring/web
```

**Add component libraries** (CLI installs, run per-component):
```bash
npx magicui-cli add bento-grid
npx magicui-cli add marquee
# Aceternity, Motion Primitives, etc.: copy-paste from their docs
```

**shadcn/ui setup** (do this first, everything depends on it):
```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog tabs
```

The `cn()` utility comes with shadcn/ui init. If you didn't use shadcn/ui's CLI, set it up manually:

```bash
npm install clsx tailwind-merge
```

```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Every component library in Section 4 imports `cn` from `@/lib/utils`. If this file doesn't exist, nothing works.
