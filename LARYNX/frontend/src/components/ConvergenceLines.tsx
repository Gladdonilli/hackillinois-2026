import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SCENE } from '@/constants'

interface ConvergenceLinesProps {
  visible?: boolean
  boost?: boolean
  target?: [number, number, number]
  followMouse?: boolean
}

/**
 * Convergence lines — thick continuous glowing arcs that fan from screen edges
 * and converge hard into the mouth glow ring. Uses TubeGeometry layered with
 * AdditiveBlending for a volumetric light beam effect.
 */

const CURVE_RESOLUTION = 64
const RADIUS_INNER = 0.005
const RADIUS_OUTER = 0.02

// 8 lines: 4 left, 4 right
const LINE_CONFIGS = [
  // Left side
  { start: [-18, 6.0, -1.0], curvature: 0.25, speedOffset: 0.1 },
  { start: [-16, 2.0, -0.5], curvature: 0.15, speedOffset: 0.4 },
  { start: [-16, -2.0, -0.5], curvature: 0.2, speedOffset: 0.7 },
  { start: [-18, -6.0, -1.0], curvature: 0.3, speedOffset: 0.2 },
  // Right side
  { start: [18, 6.0, -1.0], curvature: 0.25, speedOffset: 0.6 },
  { start: [16, 2.0, -0.5], curvature: 0.15, speedOffset: 0.3 },
  { start: [16, -2.0, -0.5], curvature: 0.2, speedOffset: 0.9 },
  { start: [18, -6.0, -1.0], curvature: 0.3, speedOffset: 0.8 },
]

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
  curvature,
  targetRef,
  baseOpacity,
  boost,
  speedOffset
}: {
  start: THREE.Vector3
  curvature: number
  targetRef: React.MutableRefObject<THREE.Vector3>
  baseOpacity: number
  boost: boolean
  speedOffset: number
}) {
  const meshOuterRef = useRef<THREE.Mesh>(null)
  const meshInnerRef = useRef<THREE.Mesh>(null)
  const matRefOuter = useRef<THREE.MeshStandardMaterial>(null)
  const matRefInner = useRef<THREE.MeshStandardMaterial>(null)
  const opacityRefOuter = useRef(baseOpacity * 0.4)
  const opacityRefInner = useRef(baseOpacity)
  const lastEndRef = useRef(targetRef.current.clone())
  const lastRebuildTimeRef = useRef(0)

  const initialCurve = useMemo(
    () => generateArcCurve(start, targetRef.current, curvature),
    [start, targetRef, curvature]
  )

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

    const now = clock.elapsedTime
    const distanceToNewTarget = lastEndRef.current.distanceTo(targetRef.current)
    if (distanceToNewTarget < 0.03) return
    if (now - lastRebuildTimeRef.current < Math.max(0.025, Math.min(delta * 6, 0.08))) return

    const updatedCurve = generateArcCurve(start, targetRef.current, curvature)
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
          color={[2.0, 2.0, 2.2]}
          emissive={[2.0, 2.0, 2.2]}
          emissiveIntensity={1.0}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={true}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={meshInnerRef} geometry={geoInner} frustumCulled={false} renderOrder={2}>
        <meshStandardMaterial
          ref={matRefInner}
          color={[2.5, 2.5, 2.8]}
          emissive={[2.5, 2.5, 2.8]}
          emissiveIntensity={2.0}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={true}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

export function ConvergenceLines({
  visible = true,
  boost = false,
  target,
  followMouse = false,
}: ConvergenceLinesProps) {
  const baseTarget = useMemo(() => {
    const pos = target ?? (SCENE.MOUTH_BEACON_POSITION as [number, number, number])
    return new THREE.Vector3(...pos)
  }, [target])

  const targetRef = useRef(baseTarget.clone())
  const desiredRef = useRef(baseTarget.clone())

  useFrame(({ pointer }, delta) => {
    if (followMouse) {
      desiredRef.current.set(
        baseTarget.x + pointer.x * 2.6,
        baseTarget.y + pointer.y * 1.6,
        baseTarget.z
      )
    } else {
      desiredRef.current.copy(baseTarget)
    }

    const lerpAlpha = Math.max(0.05, Math.min(delta * 7, 0.35))
    targetRef.current.lerp(desiredRef.current, lerpAlpha)
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
          curvature={data.curvature}
          targetRef={targetRef}
          baseOpacity={data.baseOpacity}
          boost={boost}
          speedOffset={data.speedOffset}
        />
      ))}
    </group>
  )
}
