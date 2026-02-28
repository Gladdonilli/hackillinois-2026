import { useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import gsap from "gsap"
import * as THREE from "three"
import { useLarynxStore } from "@/store/useLarynxStore"
import type { AnalysisStatus } from "@/types/larynx"

const CAMERA_PRESETS: Record<
  AnalysisStatus,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  idle: { position: [0, 0, 5], target: [0, 0, 0] },
  uploading: { position: [2, 1, 4], target: [0, 0, 0] },
  analyzing: { position: [1.5, 0.5, 3], target: [0, -0.3, 0] },
  complete: { position: [0, 0.5, 4], target: [0, 0, 0] },
  comparing: { position: [0, 0, 5], target: [0, 0, 0] },
  technical: { position: [0, 0, 5], target: [0, 0, 0] },
  closing: { position: [0, 0, 5], target: [0, 0, 0] },
  error: { position: [0, 0, 5], target: [0, 0, 0] },
}

export function CameraController() {
  const { camera } = useThree()
  const statusRef = useRef<AnalysisStatus>("idle")
  
  const orbitAngle = useRef(0)
  const zoomLevel = useRef(3.354)
  const skullClipTriggered = useRef(false)
  const isCameraOverride = useRef(false)
  
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0))
  const currentTarget = useRef(new THREE.Vector3(0, 0, 0))

  const xTo = useRef<gsap.QuickToFunc>(null!)
  const yTo = useRef<gsap.QuickToFunc>(null!)
  const zTo = useRef<gsap.QuickToFunc>(null!)

  useEffect(() => {
    xTo.current = gsap.quickTo(camera.position, "x", { duration: 0.3 })
    yTo.current = gsap.quickTo(camera.position, "y", { duration: 0.3 })
    zTo.current = gsap.quickTo(camera.position, "z", { duration: 0.3 })
  }, [camera.position])

  useEffect(() => {
    const unsub = useLarynxStore.subscribe((state) => {
      const status = state.status
      if (status === statusRef.current) return
      statusRef.current = status

      if (status === "idle" || status === "uploading" || status === "error") {
        isCameraOverride.current = false
        currentTarget.current.set(...CAMERA_PRESETS[status].target)
        gsap.to(camera.position, {
          x: CAMERA_PRESETS[status].position[0],
          y: CAMERA_PRESETS[status].position[1],
          z: CAMERA_PRESETS[status].position[2],
          duration: 1.5,
          ease: "power2.inOut",
        })
      } else if (status === "analyzing") {
        skullClipTriggered.current = false
        isCameraOverride.current = false
        orbitAngle.current = Math.atan2(1.5, 3)
        zoomLevel.current = Math.hypot(1.5, 3)
        currentTarget.current.set(0, -0.3, 0)
        camera.position.set(1.5, 0.5, 3)
      } else if (status === "complete") {
        isCameraOverride.current = true
        currentTarget.current.set(0, 0, 0)
        
        const verdict = state.verdict
        if (verdict?.isGenuine) {
          gsap.to(camera.position, {
            x: 0, y: 0.5, z: 4,
            duration: 1.2,
            ease: "power2.out",
          })
        } else {
          const initialX = camera.position.x
          const initialY = camera.position.y
          
          const shakeIntervalId = window.setInterval(() => {
            camera.position.x = initialX + (Math.random() - 0.5) * 0.1
            camera.position.y = initialY + (Math.random() - 0.5) * 0.1
          }, 30)

          setTimeout(() => {
            window.clearInterval(shakeIntervalId)
            gsap.to(camera.position, {
              x: 1, y: 1, z: 3.5,
              duration: 1.5,
              ease: "power2.inOut",
            })
          }, 300)
        }
      }
    })
    return unsub
  }, [camera])

  useFrame(({ clock }) => {
    if (statusRef.current === "analyzing") {
      const state = useLarynxStore.getState()
      
      if (state.tongueVelocity > 80 && !skullClipTriggered.current) {
        skullClipTriggered.current = true
        isCameraOverride.current = true
        currentTarget.current.set(0, -0.5, 0.3)
        
        gsap.to(camera.position, {
          x: 0.8,
          y: 0,
          z: 1.5,
          duration: 0.4,
          ease: "power3.out",
          onComplete: () => {
            setTimeout(() => {
              if (statusRef.current !== "analyzing") return
              currentTarget.current.set(0, -0.3, 0)
              
              const frames = 48
              const futureAngle = orbitAngle.current + 0.02 * frames
              const futureZoom = 2.5 + (zoomLevel.current - 2.5) * Math.pow(0.995, frames)
              const futureTime = clock.elapsedTime + 0.8
              
              const returnX = Math.sin(futureAngle) * futureZoom
              const returnY = 0.5 + Math.sin(futureTime * 2.094) * 0.15
              const returnZ = Math.cos(futureAngle) * futureZoom
              
              gsap.to(camera.position, {
                x: returnX,
                y: returnY,
                z: returnZ,
                duration: 0.8,
                ease: "power2.inOut",
                onComplete: () => {
                  if (statusRef.current === "analyzing") {
                    orbitAngle.current = futureAngle
                    zoomLevel.current = futureZoom
                    isCameraOverride.current = false
                  }
                },
              })
            }, 500)
          },
        })
      }

      if (!isCameraOverride.current) {
        orbitAngle.current += 0.02
        zoomLevel.current = THREE.MathUtils.lerp(zoomLevel.current, 2.5, 0.005)
        
        const r = zoomLevel.current
        const targetX = Math.sin(orbitAngle.current) * r
        const targetY = 0.5 + Math.sin(clock.elapsedTime * 2.094) * 0.15
        const targetZ = Math.cos(orbitAngle.current) * r

        if (xTo.current) xTo.current(targetX)
        if (yTo.current) yTo.current(targetY)
        if (zTo.current) zTo.current(targetZ)
      }
    }

    lookAtTarget.current.lerp(currentTarget.current, 0.05)
    camera.lookAt(lookAtTarget.current)
  })

  return null
}
