import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SCENE } from '@/constants'

interface ConvergenceLinesProps {
  visible?: boolean
  boost?: boolean
  target?: [number, number, number]
  cursorInfluence?: number
}

/**
 * Convergence lines — thick continuous glowing arcs that fan from screen edges
 * and converge hard into the mouth glow ring. Uses TubeGeometry layered with
 * AdditiveBlending for a volumetric light beam effect.
 */

const CURVE_RESOLUTION = 52
const RADIUS_INNER = 0.0035
const RADIUS_OUTER = 0.011
const PULSE_COUNT = 10

type BeamConfig = {
  start: [number, number, number]
  curvature: number
  speedOffset: number
}

const LINE_CONFIGS: BeamConfig[] = (() => {
  const countPerSide = 12
  const left: BeamConfig[] = Array.from({ length: countPerSide }, (_, i) => {
    const p = i / (countPerSide - 1)
    const y = THREE.MathUtils.lerp(7.2, -7.2, p)
    return {
      start: [-19.5 + Math.sin(i * 0.5) * 1.2, y, -1.5 + Math.cos(i * 0.35) * 0.8],
      curvature: 0.14 + (i % 5) * 0.035,
      speedOffset: 0.12 + i * 0.09,
    }
  })

  const right: BeamConfig[] = left.map((beam, i) => ({
    start: [-beam.start[0], beam.start[1], beam.start[2]],
    curvature: beam.curvature,
    speedOffset: beam.speedOffset + (i % 3) * 0.05,
  }))

  return [...left, ...right]
})()

function generateArcCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  curvature: number
): THREE.CatmullRomCurve3 {
  // Create control points for a sweeping arc rather than straight lerp
  const mid1 = new THREE.Vector3().lerpVectors(start, end, 0.33)
  const mid2 = new THREE.Vector3().lerpVectors(start, end, 0.66)

  // Add outward bowing based on curvature and position
  const sideSign = start.x < 0 ? 1 : -1
  const ySign = start.y > end.y ? 1 : -1

  mid1.x += sideSign * curvature * 3.0
  mid1.y += ySign * curvature * 2.0
  mid1.z += curvature * 1.5

  mid2.x += sideSign * curvature * 1.0
  mid2.y += ySign * curvature * 0.5
  mid2.z += curvature * 0.5

  return new THREE.CatmullRomCurve3([start, mid1, mid2, end], false, 'chordal', 0.5)
}

function GlowingBeam({
  start,
  targetRef,
  curvature,
  baseOpacity,
  boost,
  speedOffset
}: {
  start: THREE.Vector3
  targetRef: React.MutableRefObject<THREE.Vector3>
  curvature: number
  baseOpacity: number
  boost: boolean
  speedOffset: number
}) {
  const meshOuterRef = useRef<THREE.Mesh>(null)
  const meshInnerRef = useRef<THREE.Mesh>(null)
  const matRefOuter = useRef<THREE.MeshStandardMaterial>(null)
  const matRefInner = useRef<THREE.MeshStandardMaterial>(null)
  const pulseRefs = useRef<Array<THREE.Mesh | null>>([])
  const opacityRefOuter = useRef(baseOpacity * 0.4)
  const opacityRefInner = useRef(baseOpacity)
  const lastEndRef = useRef(targetRef.current.clone())
  const lastRebuildTimeRef = useRef(0)

  const initialCurve = useMemo(
    () => generateArcCurve(start, targetRef.current, curvature),
    [start, targetRef, curvature]
  )
  const curveRef = useRef(initialCurve)

  const geoOuter = useMemo(
    () => new THREE.TubeGeometry(initialCurve, CURVE_RESOLUTION, RADIUS_OUTER, 8, false),
    [initialCurve]
  )
  const geoInner = useMemo(
    () => new THREE.TubeGeometry(initialCurve, CURVE_RESOLUTION, RADIUS_INNER, 6, false),
    [initialCurve]
  )

  useFrame(({ clock }, delta) => {
    if (!matRefOuter.current || !matRefInner.current) return

    const t = clock.elapsedTime * (1 + speedOffset * 0.5) + speedOffset * 10
    const pulse = (Math.sin(t * 2.0) * 0.5 + 0.5) * 0.4 + 0.6

    const targetOuter = boost ? 0.6 : baseOpacity * 0.4 * pulse
    const targetInner = boost ? 1.0 : baseOpacity * pulse

    opacityRefOuter.current += (targetOuter - opacityRefOuter.current) * 0.1
    opacityRefInner.current += (targetInner - opacityRefInner.current) * 0.1

    matRefOuter.current.opacity = opacityRefOuter.current
    matRefInner.current.opacity = opacityRefInner.current

    const dir = start.x < targetRef.current.x ? 1 : -1
    pulseRefs.current.forEach((pulse, idx) => {
      if (!pulse) return
      const phase = (t * (0.22 + speedOffset * 0.1) + idx / PULSE_COUNT) % 1
      const point = curveRef.current.getPoint(phase)
      const wobble = Math.sin(t * (6 + speedOffset * 2) + idx * 1.3) * 0.04
      pulse.position.set(
        point.x,
        point.y + wobble * 0.35,
        point.z + wobble * 0.2 * dir
      )

      const pulseScale = 0.6 + (Math.sin(t * (10 + speedOffset) + idx * 0.8) * 0.5 + 0.5) * 1.05
      pulse.scale.setScalar(boost ? pulseScale * 1.35 : pulseScale)
    })

    const now = clock.elapsedTime
    const dist = lastEndRef.current.distanceTo(targetRef.current)
    if (dist < 0.035) return
    if (now - lastRebuildTimeRef.current < Math.max(0.025, Math.min(delta * 6, 0.085))) return

    const updatedCurve = generateArcCurve(start, targetRef.current, curvature)
    curveRef.current = updatedCurve
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
          color={[0.5, 2.2, 2.5]}
          emissive={[0.5, 2.2, 2.5]}
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
          color={[0.9, 2.5, 2.9]}
          emissive={[0.9, 2.5, 2.9]}
          emissiveIntensity={2.2}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      {Array.from({ length: PULSE_COUNT }).map((_, idx) => (
        <mesh
          // eslint-disable-next-line react/no-array-index-key
          key={idx}
          ref={(node) => {
            pulseRefs.current[idx] = node
          }}
          frustumCulled={false}
          renderOrder={3}
        >
          <sphereGeometry args={[0.026, 10, 10]} />
          <meshStandardMaterial
            color={[1.1, 2.8, 3.0]}
            emissive={[1.1, 2.8, 3.0]}
            emissiveIntensity={2.2}
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

  useFrame(({ pointer }, delta) => {
    desiredRef.current.set(
      baseTarget.x + pointer.x * cursorInfluence,
      baseTarget.y + pointer.y * cursorInfluence * 0.56,
      baseTarget.z
    )

    const alpha = Math.max(0.04, Math.min(delta * 7.5, 0.36))
    targetRef.current.lerp(desiredRef.current, alpha)
  })

  const curveData = useMemo(() => {
    return LINE_CONFIGS.map((config, i) => {
      const start = new THREE.Vector3(...(config.start as [number, number, number]))
      return {
        start,
        curvature: config.curvature,
        baseOpacity: 0.6 + (i % 4) * 0.1,
        speedOffset: config.speedOffset
      }
    })
  }, [])

  if (!visible) return null

  return (
    <group>
      {curveData.map((data, i) => (
        <GlowingBeam
          key={i}
          start={data.start}
          targetRef={targetRef}
          curvature={data.curvature}
          baseOpacity={data.baseOpacity}
          boost={boost}
          speedOffset={data.speedOffset}
        />
      ))}
    </group>
  )
}
