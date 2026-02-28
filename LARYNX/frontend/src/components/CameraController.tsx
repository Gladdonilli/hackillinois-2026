import { useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import gsap from "gsap"
import { useLarynxStore } from "@/store/useLarynxStore"
import type { AnalysisStatus } from "@/types/larynx"

const CAMERA_PRESETS: Record<
  AnalysisStatus,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  idle: { position: [0, 0, 5], target: [0, 0, 0] },
  uploading: { position: [2, 1, 4], target: [0, 0, 0] },
  analyzing: { position: [1.5, 0.5, 3], target: [0, -0.2, 0] },
  complete: { position: [0, 0.5, 4], target: [0, 0, 0] },
  error: { position: [0, 0, 5], target: [0, 0, 0] },
}

export function CameraController() {
  const { camera } = useThree()
  const baseY = useRef(0)
  const statusRef = useRef<AnalysisStatus>("idle")

  useEffect(() => {
    const unsub = useLarynxStore.subscribe((state) => {
      const status = state.status
      if (status === statusRef.current) return
      statusRef.current = status
      const preset = CAMERA_PRESETS[status]
      baseY.current = preset.position[1]

      gsap.to(camera.position, {
        x: preset.position[0],
        y: preset.position[1],
        z: preset.position[2],
        duration: 1.5,
        ease: 'power2.inOut',
      })
    })
    return unsub
  }, [camera])

  useFrame(({ clock }) => {
    if (statusRef.current === "analyzing") {
      camera.position.y =
        baseY.current + Math.sin(clock.elapsedTime * 2.094) * 0.1
    }
    camera.lookAt(0, 0, 0)
  })

  return null
}
