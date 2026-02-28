// Ambient type declarations for packages without proper .d.ts
// NOTE: No top-level imports here — this must remain an ambient declaration file (script).

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

// lucide-react ships no .d.ts
declare module 'lucide-react' {
  import { FC, SVGProps } from 'react'
  interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string
    color?: string
    strokeWidth?: number | string
    className?: string
  }
  export const Upload: FC<IconProps>
  export const AlertTriangle: FC<IconProps>
  export const AlertCircle: FC<IconProps>
  export const CheckCircle: FC<IconProps>
  export const XCircle: FC<IconProps>
  export const Loader2: FC<IconProps>
  export const FileAudio: FC<IconProps>
  export const AudioWaveform: FC<IconProps>
  export const X: FC<IconProps>
  export const Music: FC<IconProps>
  export const Shield: FC<IconProps>
  export const ShieldAlert: FC<IconProps>
  export const ShieldCheck: FC<IconProps>
  export const Info: FC<IconProps>
  export const ChevronDown: FC<IconProps>
  export const ChevronUp: FC<IconProps>
  export const RotateCcw: FC<IconProps>
  export const Download: FC<IconProps>
}

