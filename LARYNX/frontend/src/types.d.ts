// Type shims for packages without proper declarations
// and fixes for @types/three@0.169.0 moduleResolution:"bundler" issues

// Fix: @types/three@0.169.0 resolves `import * as THREE from 'three'` to
// build/three.module which doesn't re-export namespace members under bundler resolution.
// Re-export everything from the proper source path.
declare module 'three' {
  export * from 'three/src/Three.js'
}

// three/examples/jsm loaders
declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  import { GLTFLoader as _GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
  export { _GLTFLoader as GLTFLoader }
  export type GLTF = import('three/examples/jsm/loaders/GLTFLoader').GLTF
}

// @react-three/postprocessing ships no .d.ts — extend with ref support
declare module '@react-three/postprocessing' {
  import { ReactNode, Ref } from 'react'

  interface EffectComposerProps {
    children?: ReactNode
    enabled?: boolean
    enableNormalPass?: boolean
    multisampling?: number
    renderPriority?: number
    autoClear?: boolean
    depthBuffer?: boolean
    stencilBuffer?: boolean
  }

  interface BloomProps {
    ref?: Ref<any>
    intensity?: number
    luminanceThreshold?: number
    luminanceSmoothing?: number
    mipmapBlur?: boolean
    blendFunction?: number
  }

  interface ChromaticAberrationProps {
    ref?: Ref<any>
    offset?: [number, number] | { x: number; y: number } | any
    radialModulation?: boolean
    modulationOffset?: number
    blendFunction?: number
  }

  interface ScanlineProps {
    ref?: Ref<any>
    density?: number
    opacity?: number
    blendFunction?: number
  }

  interface GlitchProps {
    ref?: Ref<any>
    delay?: any
    duration?: any
    strength?: any
    mode?: any
    active?: boolean
    ratio?: number
  }

  interface BrightnessContrastProps {
    ref?: Ref<any>
    brightness?: number
    contrast?: number
    blendFunction?: number
  }

  interface NoiseProps {
    ref?: Ref<any>
    opacity?: number
    premultiply?: boolean
    blendFunction?: number
  }

  interface VignetteProps {
    ref?: Ref<any>
    offset?: number
    darkness?: number
    blendFunction?: number
  }

  export const EffectComposer: React.FC<EffectComposerProps>
  export const Bloom: React.FC<BloomProps>
  export const ChromaticAberration: React.FC<ChromaticAberrationProps>
  export const Scanline: React.FC<ScanlineProps>
  export const Glitch: React.FC<GlitchProps>
  export const BrightnessContrast: React.FC<BrightnessContrastProps>
  export const Noise: React.FC<NoiseProps>
  export const Vignette: React.FC<VignetteProps>
}

// Tone.js v15 removed RecursivePartial — provide a global shim
// NOTE: Do NOT use `declare module 'tone'` — it shadows all existing Tone exports.
  // Instead, declare the type globally so SoundEngine can use it.
    type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
      ? RecursivePartial<T[P]>
      : T[P]
}
