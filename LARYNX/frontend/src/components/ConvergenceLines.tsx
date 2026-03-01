import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SCENE } from '@/constants'

interface ConvergenceLinesProps {
  visible?: boolean
  boost?: boolean
  target?: [number, number, number]
  cursorInfluence?: number
}

const CURVE_RESOLUTION = 56
const RADIUS_INNER = 0.0022
const RADIUS_OUTER = 0.0068
const HOPPING_PARTICLE_COUNT = 56

type BeamConfig = {
  start: [number, number, number]
  curvature: number
  speedOffset: number
}

const LINE_CONFIGS: BeamConfig[] = (() => {
  const countPerSide = 12

  const left = Array.from({ length: countPerSide }, (_, i) => {
    const p = i / (countPerSide - 1)
    const y = THREE.MathUtils.lerp(6.9, -6.9, p)

    return {
      start: [-20 + Math.sin(i * 0.42) * 1.0, y, -1.8 + Math.cos(i * 0.33) * 0.9] as [number, number, number],
      curvature: 0.34 + (i % 4) * 0.06,
      speedOffset: 0.08 + i * 0.075,
    }
  })

  const right = left.map((beam, i) => ({
    start: [-beam.start[0], beam.start[1], beam.start[2]] as [number, number, number],
    curvature: beam.curvature,
    speedOffset: beam.speedOffset + (i % 3) * 0.05,
  }))

  return [...left, ...right]
})()

function generateArcCurve(start: THREE.Vector3, end: THREE.Vector3, curvature: number): THREE.CubicBezierCurve3 {
  const fromStart = new THREE.Vector3().lerpVectors(start, end, 0.28)
  const nearCenter = new THREE.Vector3().lerpVectors(start, end, 0.72)
  const sideSign = start.x < end.x ? 1 : -1
  const fanSign = Math.sign(start.y || 1)

  const control1 = fromStart.clone()
  control1.x += sideSign * curvature * 2.6
  control1.y += fanSign * curvature * 5.8
  control1.z += curvature * 1.8

  const control2 = nearCenter.clone()
  control2.x += sideSign * curvature * 0.8
  control2.y += fanSign * curvature * 2.5
  control2.z += curvature * 0.55

  return new THREE.CubicBezierCurve3(start.clone(), control1, control2, end.clone())
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
  targetRef: React.MutableRefObject<THREE.Vector3>
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

  const initialCurve = useMemo(
    () => generateArcCurve(start, targetRef.current, curvature),
    [start, targetRef, curvature]
  )
  const curveRef = useRef<THREE.Curve<THREE.Vector3>>(initialCurve)

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
    const pulse = (Math.sin(t * 1.8) * 0.5 + 0.5) * 0.4 + 0.62

    const targetOuter = boost ? 0.62 : baseOpacity * 0.45 * pulse
    const targetInner = boost ? 0.98 : baseOpacity * pulse

    opacityRefOuter.current += (targetOuter - opacityRefOuter.current) * 0.1
    opacityRefInner.current += (targetInner - opacityRefInner.current) * 0.1

    matRefOuter.current.opacity = opacityRefOuter.current
    matRefInner.current.opacity = opacityRefInner.current

    const now = clock.elapsedTime
    const dist = lastEndRef.current.distanceTo(targetRef.current)
    if (dist < 0.03) return
    if (now - lastRebuildTimeRef.current < Math.max(0.025, Math.min(delta * 6, 0.085))) return

    const updatedCurve = generateArcCurve(start, targetRef.current, curvature)
    curveRef.current = updatedCurve
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
          emissiveIntensity={1.1}
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
          emissiveIntensity={2.0}
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
  curveRefs: React.MutableRefObject<Array<THREE.Curve<THREE.Vector3> | null>>
  visible: boolean
  boost: boolean
}) {
  const headRefs = useRef<Array<THREE.Mesh | null>>([])
  const trailRefs = useRef<Array<THREE.Mesh | null>>([])

  const particles = useRef<HoppingState[]>(
    Array.from({ length: HOPPING_PARTICLE_COUNT }, (_, i) => ({
      line: i % LINE_CONFIGS.length,
      progress: (i * 0.17) % 1,
      speed: 0.2 + (i % 9) * 0.03,
      jumpTimer: 0.08 + (i % 7) * 0.04,
      previous: new THREE.Vector3(),
    }))
  )

  useFrame(({ clock, pointer }, delta) => {
    if (!visible) return

    const curves = curveRefs.current
    const available = curves.filter(Boolean).length
    if (available === 0) return

    const pointerEnergy = Math.min(1, Math.hypot(pointer.x, pointer.y))

    particles.current.forEach((state, idx) => {
      if (state.line >= curves.length || !curves[state.line]) {
        state.line = idx % Math.max(1, curves.length)
      }

      state.progress += delta * state.speed * (boost ? 1.3 : 1)
      state.jumpTimer -= delta

      if (state.progress >= 1) {
        state.progress -= 1
        const dir = Math.random() > 0.5 ? 1 : -1
        const spread = Math.random() > 0.72 ? 2 : 1
        state.line = clampLine(state.line + dir * spread, curves.length)
        state.jumpTimer = 0.08 + Math.random() * 0.25
      }

      const shouldHopMidline =
        state.jumpTimer <= 0 &&
        state.progress > 0.14 &&
        state.progress < 0.92 &&
        Math.random() < 0.03 + pointerEnergy * 0.04

      if (shouldHopMidline) {
        const dir = Math.random() > 0.5 ? 1 : -1
        const spread = Math.random() > 0.8 ? 2 : 1
        state.line = clampLine(state.line + dir * spread, curves.length)
        state.jumpTimer = 0.12 + Math.random() * 0.35
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
      const size = (boost ? 0.022 : 0.016) * pulse
      head.scale.setScalar(size)
      trail.scale.setScalar(size * 1.85)
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
              emissiveIntensity={1.1}
              transparent
              opacity={0.22}
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
  cursorInfluence = 0.75,
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

  useFrame(({ pointer }, delta) => {
    desiredRef.current.set(
      baseTarget.x + pointer.x * cursorInfluence,
      baseTarget.y + pointer.y * cursorInfluence * 0.58,
      baseTarget.z
    )

    const alpha = Math.max(0.035, Math.min(delta * 8.5, 0.34))
    targetRef.current.lerp(desiredRef.current, alpha)
  })

  const curveData = useMemo(() => {
    return LINE_CONFIGS.map((config, i) => ({
      start: new THREE.Vector3(...config.start),
      curvature: config.curvature,
      baseOpacity: 0.56 + (i % 5) * 0.09,
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
