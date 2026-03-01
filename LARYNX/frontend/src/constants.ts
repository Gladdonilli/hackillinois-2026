/**
 * LARYNX Frontend Constants
 * 
 * Single source of truth for all magic numbers, thresholds, colors, and timing values.
 * Import from here instead of hardcoding values in components.
 * 
 * Created during Design System v3 refactoring — Feb 28 2026
 */

// ============================================================================
// COLORS (JS-side — for THREE.Color, GSAP tweens, inline styles)
// Tailwind classes should use token names directly (text-cyan, bg-surface, etc.)
// ============================================================================

export const COLORS = {
  CYAN: '#38BDF8',
  CYAN_DIM: '#0EA5E9',
  WARN: '#DC2626',
  GENUINE: '#2DD4BF',
  VIOLATION: '#FF003C',
  DEEPFAKE: '#DC2626',
  DIM: '#71717A',
  SURFACE: '#18181B',
  SURFACE_ELEVATED: '#27272A',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
} as const

export const COLORS_RGBA = {
  CYAN_40: 'rgba(56, 189, 248, 0.4)',
  CYAN_15: 'rgba(56, 189, 248, 0.15)',
  CYAN_10: 'rgba(56, 189, 248, 0.1)',
  VIOLATION_80: 'rgba(255, 0, 60, 0.8)',
  VIOLATION_40: 'rgba(255, 0, 60, 0.4)',
  GENUINE_40: 'rgba(45, 212, 191, 0.4)',
  WARN_40: 'rgba(220, 38, 38, 0.4)',
  SURFACE_85: 'rgba(24, 24, 27, 0.85)',
  WHITE_10: 'rgba(255, 255, 255, 0.1)',
  WHITE_05: 'rgba(255, 255, 255, 0.05)',
  BLACK_60: 'rgba(0, 0, 0, 0.6)',
} as const

// ============================================================================
// PHYSICS THRESHOLDS (cm/s)
// ============================================================================

export const VELOCITY_THRESHOLDS = {
  /** Tongue tip — primary deepfake signal */
  TONGUE: 20,
  /** Jaw movement threshold */
  JAW: 15,
  /** Lip movement threshold */
  LIP: 10,
  /** Human physiological maximum (any sensor) */
  HUMAN_MAX: 22,
  /** Severe anomaly — triggers glitch effects */
  GLITCH: 50,
  /** Skull-clip threshold — triggers alarm + screen effects */
  SKULL_CLIP: 80,
} as const

// Per-sensor velocity thresholds for EMAMarkers/VelocityHUD coloring (cm/s)
// These are DISTINCT from the pipeline tier thresholds above
export const SENSOR_THRESHOLDS: Record<string, number> = {
  UL: 15,
  LL: 15,
  JAW: 20,
  T1: 25,
  T2: 25,
  T3: 25,
  tongue: 25,
  TONGUE: 25,
  jaw: 20,
  JAW_CAT: 20,
  lip: 15,
  LIP: 15,
  ul: 15,
  ll: 15,
}

// ============================================================================
// CAMERA
// ============================================================================

export const CAMERA = {
  /** Default analysis view FOV */
  DEFAULT_FOV: 45,
  /** Portal warp zoom FOV */
  WARP_FOV: 90,
  /** CompareView camera position [x, y, z] */
  COMPARE_POSITION: [0, 0, 4] as const,
  /** CameraController quickTo interpolation duration (seconds) */
  QUICK_TO_DURATION: 0.3,
  /** CameraController zoom-in factor */
  ZOOM_FACTOR: 1.2,
  SHAKE_JITTER_INTERVAL_MS: 30,
  SHAKE_SETTLE_DELAY_S: 0.3,
  SKULL_CLIP_RETURN_DELAY_S: 0.5,
} as const

// ============================================================================
// 3D SCENE POSITIONS
// ============================================================================

export const SCENE = {
  /** MouthBeacon position — centered on actual mouth of 2.5x-scaled facecap.glb */
  MOUTH_BEACON_POSITION: [0, -1.1, 0.5] as const,
  /** FaceModel group scale */
  FACE_MODEL_SCALE: 2.5,
  /** FaceModel group position [x, y, z] */
  FACE_MODEL_POSITION: [0, -0.3, 0] as const,
  /** CompareView model Y position (raised to show full face including jaw/chin) */
  COMPARE_MODEL_Y: -0.2,
  /** CompareView model scale */
  COMPARE_MODEL_SCALE: 1.2,
  /** Parallax lerp factor for face model mouse-following */
  PARALLAX_LERP: 0.03,
  /** Parallax range for face model mouse-following */
  PARALLAX_RANGE: 0.08,
} as const

// ============================================================================
// ANIMATION TIMING (seconds unless noted)
// ============================================================================

export const TIMING = {
  /** Verdict screen white flash duration */
  VERDICT_FLASH: 0.3,
  /** Verdict noise overlay decay */
  VERDICT_NOISE_DECAY: 2.0,
  /** Badge pop delay for genuine verdict */
  BADGE_POP_GENUINE: 0.3,
  /** Badge pop delay for deepfake verdict */
  BADGE_POP_DEEPFAKE: 0.4,
  /** Confidence count-up duration */
  CONFIDENCE_COUNT_DURATION: 1.2,
  /** Warp transition phase 1 (freeze) */
  WARP_PHASE_FREEZE: 0.15,
  /** Warp transition phase 2 (expand) */
  WARP_PHASE_EXPAND: 0.8,
  /** Intro sequence fade delay (milliseconds) */
  INTRO_FADE_DELAY_MS: 1200,
  /** State transition fade duration */
  STATE_TRANSITION: 0.6,
  /** Complete state fade-in */
  COMPLETE_FADE_IN: 0.8,
  /** View transition default */
  VIEW_TRANSITION: 0.6,
  /** Compare/Technical nav button appear delay */
  NAV_BUTTON_DELAY: 0.8,
  /** Verdict nav button appear delay */
  VERDICT_NAV_DELAY: 1.5,
  PORTAL_ENTER_DURATION: 2.0,
} as const

export const STREAM = {
  WATCHDOG_INITIAL_MS: 60_000,
  WATCHDOG_ACTIVE_MS: 20_000,
  WATCHDOG_TERMINAL_MS: 5_000,
} as const

// ============================================================================
// SPRING PHYSICS (for framer-motion / GSAP)
// ============================================================================

export const SPRING = {
  /** Verdict panel entrance spring stiffness */
  VERDICT_STIFFNESS: 200,
  /** Verdict panel entrance spring damping */
  VERDICT_DAMPING: 20,
  /** Badge elastic pop ease */
  BADGE_EASE: 'elastic.out(1, 0.4)',
  /** Screen shake repeat count */
  SHAKE_REPEATS: 6,
  /** Shake displacement range (px) */
  SHAKE_X: 5,
  SHAKE_Y: 3,
} as const

// ============================================================================
// POST-PROCESSING
// ============================================================================

export const POST_PROCESSING = {
  /** Bloom baseline intensity */
  BLOOM_BASELINE: 0.3,
  /** Chromatic aberration baseline */
  CA_BASELINE: 0.0004,
  /** CA at >22 cm/s (HUMAN_MAX) */
  CA_TIER_1: 0.002,
  /** CA at >50 cm/s (GLITCH) */
  CA_TIER_2: 0.006,
  /** CA at >80 cm/s (SKULL_CLIP) */
  CA_TIER_3: 0.015,
} as const

// ============================================================================
// TONGUE MODEL
// ============================================================================

export const TONGUE = {
  /** Pulse decay rate for velocity visualization */
  PULSE_DECAY: 3.0,
} as const

// ============================================================================
// GLITCH TEXT
// ============================================================================

export const GLITCH = {
  /** Character set for glitch text scramble */
  CHARS: '!<>-_\\/[]{}—=+*^?#',
  /** Number of glitch cycles before resolving */
  CYCLES: 4,
  /** Interval between glitch frames (ms) */
  INTERVAL_MS: 100,
} as const

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================

export const Z_INDEX = {
  /** Base content layer */
  CONTENT: 10,
  /** HUD overlay elements */
  HUD: 10,
  /** Title/header overlay */
  TITLE: 20,
  /** Verdict panel (above HUD) */
  VERDICT: 20,
  /** Navigation buttons */
  NAV: 30,
  /** Scanline overlay */
  SCANLINE: 50,
  /** Verdict noise overlay */
  NOISE: 90,
  /** Verdict flash overlay */
  FLASH: 100,
} as const
