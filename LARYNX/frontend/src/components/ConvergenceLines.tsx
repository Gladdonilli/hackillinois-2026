import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SCENE } from '@/constants'

interface ConvergenceLinesProps {
  visible?: boolean
  boost?: boolean
  target?: [number, number, number]
  anchorRef?: MutableRefObject<THREE.Vector3>
}

const CURVE_RESOLUTION = 56
const RADIUS_INNER = 0.003
const RADIUS_OUTER = 0.0088
const HOPPING_PARTICLE_COUNT = 28

type BeamConfig = {
  start: [number, number, number]
  curvature: number
  speedOffset: number
}

const LINE_CONFIGS: BeamConfig[] = (() => {
  const countPerSide = 12

  const left = Array.from({ length: countPerSide }, (_, i) => {
    const p = i / (countPerSide - 1)
    const spread = Math.abs(p - 0.5) * 2
    const y = THREE.MathUtils.lerp(6.9, -6.9, p)

    return {
      start: [-20.5 + Math.sin(i * 0.35) * 0.5, y, -1.9 + Math.cos(i * 0.4) * 0.6] as [number, number, number],
      curvature: 0.12 + spread * 0.1 + (i % 3) * 0.015,
      speedOffset: 0.08 + i * 0.075,
    }
  })

  const right = left.map((beam, i) => ({
    start: [-beam.start[0], beam.start[1], beam.start[2]] as [number, number, number],
    curvature: beam.curvature,
    speedOffset: beam.speedOffset + (i % 4) * 0.04,
  }))

  return [...left, ...right]
})()

function generateArcCurve(start: THREE.Vector3, end: THREE.Vector3, curvature: number): THREE.Curve<THREE.Vector3> {
  const fanSign = Math.sign(start.y - end.y || 1)
  const points: THREE.Vector3[] = []
  const steps = 14
  const exponential = 4.35
  const denom = Math.exp(exponential) - 1

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const spread = (Math.exp(exponential * t) - 1) / denom
    const x = THREE.MathUtils.lerp(end.x, start.x, t)
    const yBase = THREE.MathUtils.lerp(end.y, start.y, spread)
    const y = yBase + fanSign * curvature * Math.pow(spread, 2.4) * 3.4
    const zBase = THREE.MathUtils.lerp(end.z, start.z, t)
    const z = zBase + curvature * Math.pow(spread, 2.1) * 1.1
    points.push(new THREE.Vector3(x, y, z))
  }

  points.reverse()
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.3)
}

function GlowingBeam({
  index,
  start,
  targetRef,
  curvature,
  baseOpacity,
  boost,
  speedOffset,
  onCurveChange,
}: {
  index: number
  start: THREE.Vector3
  targetRef: MutableRefObject<THREE.Vector3>
  curvature: number
  baseOpacity: number
  boost: boolean
  speedOffset: number
  onCurveChange: (index: number, curve: THREE.Curve<THREE.Vector3>) => void
}) {
  const meshOuterRef = useRef<THREE.Mesh>(null)
  const meshInnerRef = useRef<THREE.Mesh>(null)
  const matRefOuter = useRef<THREE.MeshStandardMaterial>(null)
  const matRefInner = useRef<THREE.MeshStandardMaterial>(null)
  const opacityRefOuter = useRef(baseOpacity * 0.45)
  const opacityRefInner = useRef(baseOpacity)
  const lastEndRef = useRef(targetRef.current.clone())
  const lastRebuildTimeRef = useRef(0)

  const initialCurve = useMemo(() => generateArcCurve(start, targetRef.current, curvature), [start, targetRef, curvature])

  const geoOuter = useMemo(
    () => new THREE.TubeGeometry(initialCurve, CURVE_RESOLUTION, RADIUS_OUTER, 8, false),
    [initialCurve]
  )
  const geoInner = useMemo(
    () => new THREE.TubeGeometry(initialCurve, CURVE_RESOLUTION, RADIUS_INNER, 6, false),
    [initialCurve]
  )

  useEffect(() => {
    onCurveChange(index, initialCurve)
  }, [index, initialCurve, onCurveChange])

  useFrame(({ clock }, delta) => {
    if (!matRefOuter.current || !matRefInner.current) return

    const t = clock.elapsedTime * (1 + speedOffset * 0.42) + speedOffset * 9
    const pulse = (Math.sin(t * 1.6) * 0.5 + 0.5) * 0.35 + 0.65

    const targetOuter = boost ? 0.62 : baseOpacity * 0.45 * pulse
    const targetInner = boost ? 0.98 : baseOpacity * pulse

    opacityRefOuter.current += (targetOuter - opacityRefOuter.current) * 0.1
    opacityRefInner.current += (targetInner - opacityRefInner.current) * 0.1

    matRefOuter.current.opacity = opacityRefOuter.current
    matRefInner.current.opacity = opacityRefInner.current

    const now = clock.elapsedTime
    const dist = lastEndRef.current.distanceTo(targetRef.current)
    if (dist < 0.012) return
    if (now - lastRebuildTimeRef.current < Math.max(0.03, Math.min(delta * 6, 0.09))) return

    const updatedCurve = generateArcCurve(start, targetRef.current, curvature)
    onCurveChange(index, updatedCurve)

    const nextOuter = new THREE.TubeGeometry(updatedCurve, CURVE_RESOLUTION, RADIUS_OUTER, 8, false)
    const nextInner = new THREE.TubeGeometry(updatedCurve, CURVE_RESOLUTION, RADIUS_INNER, 6, false)

    if (meshOuterRef.current) {
      const previous = meshOuterRef.current.geometry
      meshOuterRef.current.geometry = nextOuter
      previous.dispose()
    }

    if (meshInnerRef.current) {
      const previous = meshInnerRef.current.geometry
      meshInnerRef.current.geometry = nextInner
      previous.dispose()
    }

    lastEndRef.current.copy(targetRef.current)
    lastRebuildTimeRef.current = now
  })

  return (
    <group>
      <mesh ref={meshOuterRef} geometry={geoOuter} frustumCulled={false} renderOrder={1}>
        <meshStandardMaterial
          ref={matRefOuter}
          color={[0.42, 1.98, 2.28]}
          emissive={[0.42, 1.98, 2.28]}
          emissiveIntensity={1.15}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={meshInnerRef} geometry={geoInner} frustumCulled={false} renderOrder={2}>
        <meshStandardMaterial
          ref={matRefInner}
          color={[0.9, 2.45, 2.85]}
          emissive={[0.9, 2.45, 2.85]}
          emissiveIntensity={2.05}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

type HoppingState = {
  line: number
  progress: number
  speed: number
  jumpTimer: number
  previous: THREE.Vector3
}

function clampLine(next: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(total - 1, next))
}

function HoppingLineParticles({
  curveRefs,
  visible,
  boost,
}: {
  curveRefs: MutableRefObject<Array<THREE.Curve<THREE.Vector3> | null>>
  visible: boolean
  boost: boolean
}) {
  const headRefs = useRef<Array<THREE.Mesh | null>>([])
  const trailRefs = useRef<Array<THREE.Mesh | null>>([])

  const particles = useRef<HoppingState[]>(
    Array.from({ length: HOPPING_PARTICLE_COUNT }, (_, i) => ({
      line: i % LINE_CONFIGS.length,
      progress: (i * 0.17) % 1,
      speed: 0.18 + (i % 7) * 0.03,
      jumpTimer: 0.1 + (i % 6) * 0.05,
      previous: new THREE.Vector3(),
    }))
  )

  useFrame(({ clock }, delta) => {
    if (!visible) return

    const curves = curveRefs.current
    const available = curves.filter(Boolean).length
    if (available === 0) return

    particles.current.forEach((state, idx) => {
      if (state.line >= curves.length || !curves[state.line]) {
        state.line = idx % Math.max(1, curves.length)
      }

      state.progress += delta * state.speed * (boost ? 1.25 : 1)
      state.jumpTimer -= delta

      if (state.progress >= 1) {
        state.progress -= 1
        const dir = Math.random() > 0.5 ? 1 : -1
        state.line = clampLine(state.line + dir, curves.length)
        state.jumpTimer = 0.08 + Math.random() * 0.22
      }

      const shouldHopMidline =
        state.jumpTimer <= 0 &&
        state.progress > 0.14 &&
        state.progress < 0.92 &&
        Math.random() < 0.032

      if (shouldHopMidline) {
        const dir = Math.random() > 0.5 ? 1 : -1
        const spread = Math.random() > 0.8 ? 2 : 1
        state.line = clampLine(state.line + dir * spread, curves.length)
        state.jumpTimer = 0.12 + Math.random() * 0.32
      }

      const curve = curves[state.line]
      if (!curve) return

      const point = curve.getPoint(state.progress)
      state.previous.lerp(point, 0.32)

      const head = headRefs.current[idx]
      const trail = trailRefs.current[idx]
      if (!head || !trail) return

      head.position.copy(point)
      trail.position.copy(state.previous)

      const pulse = 0.5 + (Math.sin(clock.elapsedTime * (6 + (idx % 5)) + idx * 0.7) * 0.5 + 0.5) * 0.95
      const size = (boost ? 0.02 : 0.015) * pulse
      head.scale.setScalar(size)
      trail.scale.setScalar(size * 1.3)
    })
  })

  return (
    <group>
      {Array.from({ length: HOPPING_PARTICLE_COUNT }).map((_, idx) => (
        <group key={idx}>
          <mesh
            ref={(node) => {
              headRefs.current[idx] = node
            }}
            frustumCulled={false}
            renderOrder={4}
          >
            <sphereGeometry args={[0.02, 9, 9]} />
            <meshStandardMaterial
              color={[1.1, 2.75, 2.95]}
              emissive={[1.1, 2.75, 2.95]}
              emissiveIntensity={2.2}
              transparent
              opacity={0.94}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>

          <mesh
            ref={(node) => {
              trailRefs.current[idx] = node
            }}
            frustumCulled={false}
            renderOrder={3}
          >
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial
              color={[0.85, 2.3, 2.6]}
              emissive={[0.85, 2.3, 2.6]}
              emissiveIntensity={1.05}
              transparent
              opacity={0.2}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function ConvergenceLines({
  visible = true,
  boost = false,
  target,
  anchorRef,
}: ConvergenceLinesProps) {
  const baseTarget = useMemo(() => {
    const pos = target ?? (SCENE.MOUTH_BEACON_POSITION as [number, number, number])
    return new THREE.Vector3(...pos)
  }, [target])

  const targetRef = useRef(baseTarget.clone())
  const desiredRef = useRef(baseTarget.clone())
  const curveRefs = useRef<Array<THREE.Curve<THREE.Vector3> | null>>([])

  const handleCurveChange = (index: number, curve: THREE.Curve<THREE.Vector3>) => {
    curveRefs.current[index] = curve
  }

  useFrame((_, delta) => {
    if (anchorRef) {
      desiredRef.current.copy(anchorRef.current)
    } else {
      desiredRef.current.copy(baseTarget)
    }

    const alpha = Math.max(0.06, Math.min(delta * 9, 0.4))
    targetRef.current.lerp(desiredRef.current, alpha)
  })

  const curveData = useMemo(() => {
    return LINE_CONFIGS.map((config, i) => ({
      start: new THREE.Vector3(...config.start),
      curvature: config.curvature,
      baseOpacity: 0.58 + (i % 5) * 0.08,
      speedOffset: config.speedOffset,
    }))
  }, [])

  if (!visible) return null

  return (
    <group>
      {curveData.map((data, i) => (
        <GlowingBeam
          key={i}
          index={i}
          start={data.start}
          targetRef={targetRef}
          curvature={data.curvature}
          baseOpacity={data.baseOpacity}
          boost={boost}
          speedOffset={data.speedOffset}
          onCurveChange={handleCurveChange}
        />
      ))}

      <HoppingLineParticles curveRefs={curveRefs} visible={visible} boost={boost} />
    </group>
  )
}
