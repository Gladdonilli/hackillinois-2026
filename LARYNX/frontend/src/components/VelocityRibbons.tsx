import { Trail, CatmullRomLine } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { useLarynxStore } from '@/store/useLarynxStore'

// Typing helper to avoid 'any' when setting color natively
type Line2Mesh = {
  geometry: { setPositions: (positions: number[]) => void },
  material: { color: THREE.Color; transparent: boolean; opacity: number; linewidth: number; lineWidth: number }
}

export function VelocityRibbons() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const trailGroupRef = useRef<THREE.Group>(null!)
  const lineRef = useRef<THREE.Mesh>(null!)

  // Pre-allocate values outside useFrame to avoid allocations
  const _normalColor = useRef(new THREE.Color('#38BDF8'))
  const _warnColor = useRef(new THREE.Color('#EA580C'))
  const _dangerColor = useRef(new THREE.Color('#DC2626'))
  const currentColor = useRef(new THREE.Color('#38BDF8'))
  const targetColor = useRef(new THREE.Color('#38BDF8'))
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
  ]), [])
  // Pre-allocate Float32Array for setPositions (avoid flatMap allocating new array every frame)
  const positionsBuffer = useRef(new Float32Array(153))

  // Memoize attenuation so it doesn't trigger Trail component re-renders
  const handleAttenuation = useMemo(() => (t: number) => t * t, [])

  useFrame((_, delta) => {
    const state = useLarynxStore.getState()
    const velocity = state.tongueVelocity || 0
    const frame = state.frames[state.currentFrame]

    if (frame && frame.sensors) {
      const t1 = frame.sensors['T1'] || { x: 0, y: 0 }
      const t2 = frame.sensors['T2'] || { x: 0, y: 0 }
      const t3 = frame.sensors['T3'] || { x: 0, y: 0 }
      const jaw = frame.sensors['JAW'] || { x: 0, y: 0 }

      if (meshRef.current) {
        meshRef.current.position.set(t1.x / 50, t1.y / 50, 0.3)
      }

      if (lineRef.current) {
        curve.points[0].set(t1.x / 50, t1.y / 50, 0.3)
        curve.points[1].set(t2.x / 50, t2.y / 50, 0.3)
        curve.points[2].set(t3.x / 50, t3.y / 50, 0.3)
        curve.points[3].set(jaw.x / 50, jaw.y / 50, 0.3)

        // Copy interpolated points into pre-allocated buffer (avoids flatMap allocation per frame)
        const pts = curve.getPoints(50)
        const positions = positionsBuffer.current
        for (let i = 0; i < pts.length; i++) {
          positions[i * 3] = pts[i].x
          positions[i * 3 + 1] = pts[i].y
          positions[i * 3 + 2] = pts[i].z
        }
        const lineAsMesh = lineRef.current as unknown as Line2Mesh
        if (lineAsMesh.geometry?.setPositions) {
          lineAsMesh.geometry.setPositions(positions as unknown as number[])
        }
      }

    }
    // Determine target color based on velocity thresholds
    if (velocity < 22) {
      targetColor.current.copy(_normalColor.current)
    } else if (velocity >= 22 && velocity <= 80) {
      const fraction = (velocity - 22) / 58
      targetColor.current.lerpColors(_warnColor.current, _dangerColor.current, fraction)
    } else {
      targetColor.current.copy(_dangerColor.current)
    }

    // Smoothly interpolate current frame's path color to target
    currentColor.current.lerp(targetColor.current, 10 * delta)

    // Opacity and width mapping
    const targetOpacity = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(velocity, 0, 80, 0.2, 1.0), 0.2, 1.0)
    const targetTrailWidth = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(velocity, 0, 80, 0.1, 0.8), 0.1, 0.8)
    const targetLineWidth = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(velocity, 0, 80, 1, 4), 1, 4)

    // Apply color directly to Trail child material (skips React DOM updates for 60fps)
    if (trailGroupRef.current) {
      trailGroupRef.current.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as Line2Mesh['material']
          if (mat) {
            if (mat.color) mat.color.copy(currentColor.current)
            if (mat.opacity !== undefined) {
              mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 10 * delta)
              mat.transparent = true
            }
            if (mat.lineWidth !== undefined) mat.lineWidth = THREE.MathUtils.lerp(mat.lineWidth, targetTrailWidth, 10 * delta)
            if (mat.linewidth !== undefined) mat.linewidth = THREE.MathUtils.lerp(mat.linewidth, targetTrailWidth, 10 * delta)
          }
        }
      })
    }

    if (lineRef.current) {
      const mat = (lineRef.current as unknown as Line2Mesh).material
      if (mat) {
        if (mat.color) mat.color.copy(currentColor.current)
        mat.transparent = true
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 10 * delta)
        mat.lineWidth = THREE.MathUtils.lerp(mat.lineWidth, targetLineWidth, 10 * delta)
      }
    }
  })
  return (
    <group>
      <group ref={trailGroupRef}>
        <Trail
          width={0.1}
          length={8}
          decay={1}
          color={_normalColor.current}
          attenuation={handleAttenuation}
        >
          <mesh ref={meshRef}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </Trail>
      </group>
      <CatmullRomLine
        ref={lineRef as unknown as React.RefObject<never>}
        points={[[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]}
        color="#38BDF8"
        lineWidth={1}
        transparent
        opacity={0.2}
      />
    </group>
  )
}
