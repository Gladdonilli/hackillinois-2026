import { useEffect, useMemo, useRef, useCallback, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SCENE } from '@/constants'
import { useLarynxStore } from '@/store/useLarynxStore'

interface ConvergenceLinesProps {
  visible?: boolean
  boost?: boolean
  target?: [number, number, number]
  anchorRef?: MutableRefObject<THREE.Vector3>
}

// ── Config ──────────────────────────────────────────────────────────
const LINE_COUNT = 14              // lines per side (left + right = 28 total)
const CURVE_POINTS = 64            // sample points per curve
const TUBE_RADIUS = 0.004
const PARTICLE_COUNT = 28

// ── Hyperbolic Cosine Model ─────────────────────────────────────────
//
// y_i(x) = ±(a · e^(k·i)) · (cosh(b·x) - 1)
//
// a = base thickness (innermost line offset from center)
// k = exponential growth rate (how fast gaps between lines widen)
// b = curvature rate (how quickly lines fan outward along x)
// i = line index (0, 1, 2, ...)
//
// Lines never loop back — they diverge infinitely off-screen.
//
const HYPER_A = 0.015              // base thickness — tight inner lines
const HYPER_K = 0.35               // exponential growth — outer lines spread fast
const HYPER_B = 0.26               // curvature — controls how quickly lines fan out

// X range: how far left/right the curves extend (in world units)
const X_RANGE = 22

// ── Jitter config ───────────────────────────────────────────────────
// Volatile state: cranked to max. Calm state: multiplied by 0.
const JITTER_FREQ_1 = 3.7
const JITTER_FREQ_2 = 7.1
const JITTER_FREQ_3 = 13.3
const JITTER_TIME_SPEED_1 = 4.2
const JITTER_TIME_SPEED_2 = 6.8
const JITTER_TIME_SPEED_3 = 11.1

function makeHyperbolicCurve(
  lineIndex: number,
  sign: 1 | -1,              // +1 = upper curve, -1 = lower curve
  side: 'left' | 'right',
  origin: THREE.Vector3,
  time: number,               // elapsed time for animated jitter
  _volatility: number,         // 0 = calm, 1 = full spasmatic
): THREE.CatmullRomCurve3 {
  const amplitude = HYPER_A * Math.exp(HYPER_K * lineIndex)

  const points: THREE.Vector3[] = []

  // For left side: x goes from 0 to -X_RANGE
  // For right side: x goes from 0 to +X_RANGE
  const xDir = side === 'right' ? 1 : -1

  for (let i = 0; i <= CURVE_POINTS; i++) {
    const t = i / CURVE_POINTS
    const x = t * X_RANGE * xDir

    // y = ±amplitude · (cosh(b·x) - 1)
    const baseY = sign * amplitude * (Math.cosh(HYPER_B * Math.abs(x)) - 1)

    // Spasmatic jitter — animated, scales with distance and volatility
    // Multiple sine frequencies with time-varying phase for organic motion
    const dist = Math.abs(x)
    const jitterAmp = dist * dist * 0.003 * (1 + lineIndex * 0.15) * (0.3 + 0.7 * (lineIndex / (LINE_COUNT - 1)))
    const jitter = jitterAmp * (
      Math.sin(dist * JITTER_FREQ_1 + lineIndex * 11.3 + time * JITTER_TIME_SPEED_1) * 0.6 +
      Math.sin(dist * JITTER_FREQ_2 + lineIndex * 5.7 + sign * 2.1 + time * JITTER_TIME_SPEED_2) * 0.3 +
      Math.sin(dist * JITTER_FREQ_3 + lineIndex * 3.1 + time * JITTER_TIME_SPEED_3) * 0.1
    )

    const y = baseY + jitter

    // Slight z depth variation — outer lines slightly further back
    const z = -lineIndex * 0.015

    points.push(new THREE.Vector3(
      origin.x + x,
      origin.y + y,
      origin.z + z,
    ))
  }

  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.3)
}

// ── Color helpers ───────────────────────────────────────────────────
// Per-vertex distance-based: near ring center = cyan, far = red.
const CYAN = new THREE.Color(0.22, 0.74, 0.97)
const MID_ORANGE = new THREE.Color(0.92, 0.34, 0.05)
const DEEP_RED = new THREE.Color(0.86, 0.15, 0.15)

// Max distance for full red — beyond this is clamped
const COLOR_RADIUS_MAX = 16
const COLOR_RADIUS_MIN = 1.5  // inner dead zone stays pure cyan

const _tmpColor = new THREE.Color()
const _tmpVec = new THREE.Vector3()

function applyDistanceColors(
  geo: THREE.TubeGeometry,
  center: THREE.Vector3,
  verticalMult: number = 1.5,
): void {
  const posAttr = geo.getAttribute('position')
  const count = posAttr.count
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    _tmpVec.set(
      posAttr.getX(i) - center.x,
      (posAttr.getY(i) - center.y) * verticalMult,  // vertical multiplier
      posAttr.getZ(i) - center.z,
    )
    const dist = _tmpVec.length()
    const t = Math.max(0, Math.min(1, (dist - COLOR_RADIUS_MIN) / (COLOR_RADIUS_MAX - COLOR_RADIUS_MIN)))

    if (t < 0.5) {
      _tmpColor.copy(CYAN).lerp(MID_ORANGE, t * 2)
    } else {
      _tmpColor.copy(MID_ORANGE).lerp(DEEP_RED, (t - 0.5) * 2)
    }

    colors[i * 3] = _tmpColor.r
    colors[i * 3 + 1] = _tmpColor.g
    colors[i * 3 + 2] = _tmpColor.b
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

// ── Single beam ─────────────────────────────────────────────────────
function HyperbolicBeam({
  lineIndex,
  sign,
  side,
  targetRef,
  speedOffset,
  onCurveReady,
  volatilityRef,
}: {
  lineIndex: number
  sign: 1 | -1
  side: 'left' | 'right'
  targetRef: MutableRefObject<THREE.Vector3>
  speedOffset: number
  onCurveReady: (i: number, c: THREE.CatmullRomCurve3) => void
  volatilityRef: MutableRefObject<number>
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  // Global index: left-upper, left-lower, right-upper, right-lower
  const sideBase = side === 'left' ? 0 : LINE_COUNT * 2
  const signBase = sign === 1 ? 0 : LINE_COUNT
  const globalIndex = sideBase + signBase + lineIndex


  // Working color objects (avoid allocation per frame)

  // Initial geometry
  const initialCurve = useMemo(
    () => makeHyperbolicCurve(lineIndex, sign, side, targetRef.current, 0, 1),
    [lineIndex, sign, side, targetRef],
  )

  const geo = useMemo(
    () => new THREE.TubeGeometry(initialCurve, CURVE_POINTS, TUBE_RADIUS, 6, false),
    [initialCurve],
  )

  useEffect(() => {
    onCurveReady(globalIndex, initialCurve)
  }, [globalIndex, initialCurve, onCurveReady])

  useFrame(({ clock }) => {
    if (!matRef.current || !meshRef.current) return

    const vol = volatilityRef.current
    const time = clock.elapsedTime

    // Pulse opacity — stronger when volatile
    const t = time * (1 + speedOffset * 0.3) + speedOffset * 7
    const basePulse = 0.5 + Math.sin(t * 1.4) * 0.2
    const volatilePulse = 0.4 + Math.sin(t * 2.8) * 0.35
    matRef.current.opacity = THREE.MathUtils.lerp(basePulse, volatilePulse, vol)

    // Apply per-vertex distance-based colors
    // (will be applied after geometry rebuild below)

    // Rebuild curve every frame with time-animated jitter
    const curve = makeHyperbolicCurve(lineIndex, sign, side, targetRef.current, time, vol)
    onCurveReady(globalIndex, curve)
    const next = new THREE.TubeGeometry(curve, CURVE_POINTS, TUBE_RADIUS, 6, false)
    applyDistanceColors(next, targetRef.current, 1.5)

    const prev = meshRef.current.geometry
    meshRef.current.geometry = next
    prev.dispose()
  })

  return (
    <mesh ref={meshRef} geometry={geo} frustumCulled={false} renderOrder={1}>
      <meshStandardMaterial
        ref={matRef}
        vertexColors
        emissive={CYAN}
        emissiveIntensity={0.3}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </mesh>
  )
}

// ── Hopping particles ───────────────────────────────────────────────
type Particle = {
  line: number
  progress: number
  speed: number
  jumpCooldown: number
}

function HoppingParticles({
  curveRefs,
  visible,
  volatilityRef,
}: {
  curveRefs: MutableRefObject<Array<THREE.CatmullRomCurve3 | null>>
  visible: boolean
  volatilityRef: MutableRefObject<number>
}) {
  const dotsRef = useRef<Array<THREE.Mesh | null>>([])
  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      line: i % (LINE_COUNT * 4),
      progress: (i * 0.13) % 1,
      speed: 0.12 + (i % 5) * 0.04,
      jumpCooldown: 0.2 + (i % 4) * 0.1,
    })),
  )

  useFrame(({ clock }, delta) => {
    if (!visible) return
    const curves = curveRefs.current
    const total = curves.filter(Boolean).length
    if (total === 0) return

    const clampedDelta = Math.min(delta, 0.1)
    const vol = volatilityRef.current

    // Particle speed scales with volatility: calm = normal, volatile = 2.5x
    const speedMult = THREE.MathUtils.lerp(1.0, 2.5, vol)
    // Jump probability scales with volatility
    const jumpChance = THREE.MathUtils.lerp(0.01, 0.06, vol)

    particles.current.forEach((p, i) => {
      p.progress -= clampedDelta * p.speed * speedMult
      p.jumpCooldown -= clampedDelta

      // At end of line, jump to neighbor
      if (p.progress <= 0) {
        p.progress += 1
        const dir = Math.random() > 0.5 ? 1 : -1
        p.line = Math.max(0, Math.min(curves.length - 1, p.line + dir))
        p.jumpCooldown = 0.15 + Math.random() * 0.25
      }

      // Random mid-line hop — more aggressive when volatile
      if (p.jumpCooldown <= 0 && Math.random() < jumpChance) {
        const dir = Math.random() > 0.5 ? 1 : -1
        p.line = Math.max(0, Math.min(curves.length - 1, p.line + dir))
        p.jumpCooldown = 0.2 + Math.random() * 0.3
      }

      // Clamp line
      if (p.line >= curves.length || !curves[p.line]) {
        p.line = i % Math.max(1, total)
      }

      const curve = curves[p.line]
      if (!curve) return

      const point = curve.getPoint(Math.min(p.progress, 1))
      const dot = dotsRef.current[i]
      if (!dot) return

      dot.position.copy(point)
      const pulse = 0.6 + Math.sin(clock.elapsedTime * 5 + i * 1.1) * 0.4
      dot.scale.setScalar(0.018 * pulse)
    })
  })

  return (
    <group>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <mesh
          key={i}
          ref={(node) => { dotsRef.current[i] = node }}
          frustumCulled={false}
          renderOrder={4}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color={[1.2, 2.8, 3.0]}
            emissive={[1.2, 2.8, 3.0]}
            emissiveIntensity={2.5}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

// ── Main export ─────────────────────────────────────────────────────
export function ConvergenceLines({
  visible = true,
  anchorRef,
  target,
}: ConvergenceLinesProps) {
  const baseTarget = useMemo(() => {
    const pos = target ?? (SCENE.MOUTH_BEACON_POSITION as [number, number, number])
    return new THREE.Vector3(...pos)
  }, [target])

  const targetRef = useRef(baseTarget.clone())
  const desiredRef = useRef(baseTarget.clone())
  const curveRefs = useRef<Array<THREE.CatmullRomCurve3 | null>>([])

  // Volatility: 1 = idle/red/spasmatic, 0 = calm/cyan/smooth
  // Driven by store state — snaps toward 0 the moment user uploads or analysis starts
  const volatilityRef = useRef(1.0)

  const handleCurveReady = useCallback((i: number, c: THREE.CatmullRomCurve3) => {
    curveRefs.current[i] = c
  }, [])

  useFrame((_, delta) => {
    if (anchorRef) {
      desiredRef.current.copy(anchorRef.current)
    } else {
      desiredRef.current.copy(baseTarget)
    }
    const alpha = Math.max(0.06, Math.min(delta * 9, 0.4))
    targetRef.current.lerp(desiredRef.current, alpha)

    // Drive volatility from store state (read outside React render via getState)
    const { status, audioFile } = useLarynxStore.getState()
    const wantVolatile = status === 'idle' && audioFile === null
    const targetVol = wantVolatile ? 1.0 : 0.0
    // Snap fast toward calm (0.15), ease back to volatile slowly (0.04)
    const lerpRate = targetVol < volatilityRef.current ? 0.15 : 0.04
    const clampedDelta = Math.min(delta, 0.1)
    volatilityRef.current += (targetVol - volatilityRef.current) * lerpRate * clampedDelta * 60
  })

  if (!visible) return null

  return (
    <group>
      {/* Left side — upper and lower curves */}
      {Array.from({ length: LINE_COUNT }).map((_, i) => (
        <HyperbolicBeam
          key={`LU${i}`}
          lineIndex={i}
          sign={1}
          side="left"
          targetRef={targetRef}
          speedOffset={i * 0.09}
          onCurveReady={handleCurveReady}
          volatilityRef={volatilityRef}
        />
      ))}
      {Array.from({ length: LINE_COUNT }).map((_, i) => (
        <HyperbolicBeam
          key={`LD${i}`}
          lineIndex={i}
          sign={-1}
          side="left"
          targetRef={targetRef}
          speedOffset={i * 0.09 + 0.03}
          onCurveReady={handleCurveReady}
          volatilityRef={volatilityRef}
        />
      ))}

      {/* Right side — upper and lower curves */}
      {Array.from({ length: LINE_COUNT }).map((_, i) => (
        <HyperbolicBeam
          key={`RU${i}`}
          lineIndex={i}
          sign={1}
          side="right"
          targetRef={targetRef}
          speedOffset={i * 0.09 + 0.05}
          onCurveReady={handleCurveReady}
          volatilityRef={volatilityRef}
        />
      ))}
      {Array.from({ length: LINE_COUNT }).map((_, i) => (
        <HyperbolicBeam
          key={`RD${i}`}
          lineIndex={i}
          sign={-1}
          side="right"
          targetRef={targetRef}
          speedOffset={i * 0.09 + 0.08}
          onCurveReady={handleCurveReady}
          volatilityRef={volatilityRef}
        />
      ))}

      <HoppingParticles curveRefs={curveRefs} visible={visible} volatilityRef={volatilityRef} />
    </group>
  )
}
