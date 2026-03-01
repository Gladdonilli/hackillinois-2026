import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { QuadraticBezierLine } from '@react-three/drei'
import * as THREE from 'three'
import { SCENE } from '@/constants'

interface ConvergenceLinesProps {
  visible?: boolean
  boost?: boolean
  target?: [number, number, number]
}

interface LineConfig {
  start: THREE.Vector3
  mid: THREE.Vector3
  end: THREE.Vector3
  speed: number
  baseOpacity: number
  lineWidth: number
}

function generateMidPoint(start: THREE.Vector3, end: THREE.Vector3, offset: number): THREE.Vector3 {
  // Gravitational pull: control point sits very close to the end (mouth),
  // so lines converge tightly near center and fan out wide at the edges.
  // t=0.85 means the bend happens 85% of the way toward the mouth.
  const mid = new THREE.Vector3().lerpVectors(start, end, 0.85)
  // Perpendicular offset in xz plane — scaled by distance so outer lines spread more
  const dir = new THREE.Vector3().subVectors(end, start).normalize()
  const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize()
  mid.add(perp.multiplyScalar(offset * 0.4))
  return mid
}

const LINE_STARTS: [number, number, number][] = [
  [-10, 3, -3],    // left-high — wide spread at edge
  [-9, -3, -2],    // left-low — opposite vertical
  [10, 2, -3],     // right-high — mirror of left
  [9, -4, -2],     // right-low — mirror, slightly lower
]

// Perpendicular offsets per line (pre-determined for visual balance)
const CURVE_OFFSETS = [3.0, -2.5, -3.0, 2.5]

function SingleLine({ config, boost }: { config: LineConfig; boost: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineRef = useRef<any>(null)
  const currentOpacity = useRef(config.baseOpacity)
  const currentSpeed = useRef(config.speed)

  useFrame((_, delta) => {
    if (!lineRef.current) return

    // Lerp toward target opacity/speed based on boost
    const targetOpacity = boost ? 0.9 : config.baseOpacity
    const targetSpeed = boost ? config.speed * 2.5 : config.speed
    currentOpacity.current += (targetOpacity - currentOpacity.current) * 0.08
    currentSpeed.current += (targetSpeed - currentSpeed.current) * 0.08

    // Animate dash offset for energy flow effect
    const mat = lineRef.current.material
    if (mat) {
      mat.dashOffset -= delta * currentSpeed.current
      mat.opacity = currentOpacity.current
    }
  })

  return (
    <QuadraticBezierLine
      ref={lineRef}
      start={config.start}
      mid={config.mid}
      end={config.end}
      color={new THREE.Color(4.0, 2.5, 1.0)}
      lineWidth={boost ? 3.5 : config.lineWidth}
      dashed
      dashScale={50}
      dashSize={1}
      gapSize={3}
      transparent
      opacity={config.baseOpacity}
      toneMapped={false}
      depthWrite={false}
    />
  )
}

export function ConvergenceLines({
  visible = true,
  boost = false,
  target,
}: ConvergenceLinesProps) {
  const endPoint = useMemo(() => {
    const pos = target ?? (SCENE.MOUTH_BEACON_POSITION as [number, number, number])
    return new THREE.Vector3(...pos)
  }, [target])

  const lineConfigs = useMemo<LineConfig[]>(() => {
    return LINE_STARTS.map((startPos, i) => {
      const start = new THREE.Vector3(...startPos)
      const mid = generateMidPoint(start, endPoint, CURVE_OFFSETS[i])
      return {
        start,
        mid,
        end: endPoint,
        speed: 0.4 + (i % 3) * 0.08,
        baseOpacity: 0.3 + (i % 2) * 0.1,
        lineWidth: 1.5 + (i % 2) * 0.3,
      }
    })
  }, [endPoint])

  if (!visible) return null

  return (
    <group renderOrder={-1}>
      {lineConfigs.map((config, i) => (
        <SingleLine key={i} config={config} boost={boost} />
      ))}
    </group>
  )
}
