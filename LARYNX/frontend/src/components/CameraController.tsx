import { useRef, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import gsap from "gsap"
import * as THREE from "three"
import { useLarynxStore } from "@/store/useLarynxStore"
import type { AnalysisStatus } from "@/types/larynx"
import { CAMERA } from "@/constants"
const CAMERA_PRESETS: Record<
  AnalysisStatus,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  idle: { position: [0, 0, 5], target: [0, 0, 0] },
  uploading: { position: [2, 1, 4], target: [0, 0, 0] },
  analyzing: { position: [1.5, 0.5, 3], target: [0, -0.3, 0] },
  complete: { position: [0, 0.5, 4], target: [0, -0.5, 0] },
  comparing: { position: [2, 1, 5], target: [0, 0, 0] },
  technical: { position: [0, 0, 3], target: [0, 0, 0] },
  closing: { position: [0, 0.5, 6], target: [0, 0, 0] },
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
  const shakeIntervalRef = useRef<number | null>(null)
  const shakeSettleTimeoutRef = useRef<number | null>(null)
  const skullClipReturnTimeoutRef = useRef<number | null>(null)

  const xTo = useRef<gsap.QuickToFunc>(null!)
  const yTo = useRef<gsap.QuickToFunc>(null!)
  const zTo = useRef<gsap.QuickToFunc>(null!)

  useEffect(() => {
    xTo.current = gsap.quickTo(camera.position, "x", { duration: CAMERA.QUICK_TO_DURATION })
    yTo.current = gsap.quickTo(camera.position, "y", { duration: CAMERA.QUICK_TO_DURATION })
    zTo.current = gsap.quickTo(camera.position, "z", { duration: CAMERA.QUICK_TO_DURATION })
  }, [camera.position])

  useEffect(() => {
    const unsub = useLarynxStore.subscribe((state) => {
      const status = state.status
      const oldStatus = statusRef.current
      if (status === oldStatus) return
      statusRef.current = status

      if (shakeIntervalRef.current !== null) {
        window.clearInterval(shakeIntervalRef.current)
        shakeIntervalRef.current = null
      }
      if (shakeSettleTimeoutRef.current !== null) {
        window.clearTimeout(shakeSettleTimeoutRef.current)
        shakeSettleTimeoutRef.current = null
      }
      if (skullClipReturnTimeoutRef.current !== null) {
        window.clearTimeout(skullClipReturnTimeoutRef.current)
        skullClipReturnTimeoutRef.current = null
      }

      // Kill any active tweens on camera to prevent jumpiness on rapid transitions
      gsap.killTweensOf(camera)
      gsap.killTweensOf(camera.position)

      const tl = gsap.timeline({
        onUpdate: () => camera.updateProjectionMatrix(),
      })

      if (oldStatus === "analyzing" && status === "complete") {
        isCameraOverride.current = true
        currentTarget.current.set(...CAMERA_PRESETS.complete.target)
        
        const verdict = state.verdict
        if (verdict?.isGenuine) {
          tl.to(camera, { fov: 50, duration: 1.2, ease: "power2.out" }, 0)
          tl.to(camera.position, {
            x: CAMERA_PRESETS.complete.position[0],
            y: CAMERA_PRESETS.complete.position[1],
            z: CAMERA_PRESETS.complete.position[2],
            duration: 1.2,
            ease: "power2.out",
          }, 0)
        } else {
          const initialX = CAMERA_PRESETS.analyzing.position[0] * CAMERA.ZOOM_FACTOR // Approximate the camera position when zooming in
          const initialY = CAMERA_PRESETS.analyzing.position[1] * CAMERA.ZOOM_FACTOR
          
          shakeIntervalRef.current = window.setInterval(() => {
            camera.position.x = initialX + (Math.random() - 0.5) * 0.1
            camera.position.y = initialY + (Math.random() - 0.5) * 0.1
          }, CAMERA.SHAKE_JITTER_INTERVAL_MS)

          shakeSettleTimeoutRef.current = window.setTimeout(() => {
            if (shakeIntervalRef.current !== null) {
              window.clearInterval(shakeIntervalRef.current)
              shakeIntervalRef.current = null
            }
            const shakeTl = gsap.timeline({
              onUpdate: () => camera.updateProjectionMatrix(),
            })
            shakeTl.to(camera, { fov: 50, duration: 1.2, ease: "power2.out" }, 0)
            shakeTl.to(camera.position, {
              x: CAMERA_PRESETS.complete.position[0],
              y: CAMERA_PRESETS.complete.position[1],
              z: CAMERA_PRESETS.complete.position[2],
              duration: 1.2,
              ease: "power2.out",
            }, 0)
            shakeSettleTimeoutRef.current = null
          }, CAMERA.SHAKE_SETTLE_DELAY_S * 1000)
        }
      } else if (oldStatus === "complete" && status === "comparing") {
        isCameraOverride.current = true
        currentTarget.current.set(...CAMERA_PRESETS.comparing.target)
        tl.to(camera, { fov: 45, duration: 1.5, ease: "power2.inOut" }, 0)
        tl.to(camera.position, {
          x: CAMERA_PRESETS.comparing.position[0],
          y: CAMERA_PRESETS.comparing.position[1],
          z: CAMERA_PRESETS.comparing.position[2],
          duration: 1.5,
          ease: "power2.inOut",
        }, 0)
      } else if (oldStatus === "comparing" && status === "technical") {
        isCameraOverride.current = true
        currentTarget.current.set(...CAMERA_PRESETS.technical.target)
        tl.to(camera, { fov: 40, duration: 1, ease: "power2.inOut" }, 0)
        tl.to(camera.position, {
          x: CAMERA_PRESETS.technical.position[0],
          y: CAMERA_PRESETS.technical.position[1],
          z: CAMERA_PRESETS.technical.position[2],
          duration: 1,
          ease: "power2.inOut",
        }, 0)
      } else if (oldStatus === "technical" && status === "closing") {
        isCameraOverride.current = true
        currentTarget.current.set(...CAMERA_PRESETS.closing.target)
        tl.to(camera, { fov: 50, duration: 2, ease: "power2.inOut" }, 0)
        tl.to(camera.position, {
          x: CAMERA_PRESETS.closing.position[0],
          y: CAMERA_PRESETS.closing.position[1],
          z: CAMERA_PRESETS.closing.position[2],
          duration: 2,
          ease: "power2.inOut",
        }, 0)
      } else if (oldStatus === "closing" && status === "idle") {
        isCameraOverride.current = false
        currentTarget.current.set(...CAMERA_PRESETS.idle.target)
        tl.to(camera, { fov: 45, duration: 0.5, ease: "power2.inOut" }, 0)
        tl.to(camera.position, {
          x: CAMERA_PRESETS.idle.position[0],
          y: CAMERA_PRESETS.idle.position[1],
          z: CAMERA_PRESETS.idle.position[2],
          duration: 0.5,
          ease: "power2.inOut",
        }, 0)
      } else if (status === "idle" || status === "uploading" || status === "error") {
        isCameraOverride.current = false
        currentTarget.current.set(...CAMERA_PRESETS[status].target)
        tl.to(camera, { fov: 45, duration: 1.5, ease: "power2.inOut" }, 0)
        tl.to(camera.position, {
          x: CAMERA_PRESETS[status].position[0],
          y: CAMERA_PRESETS[status].position[1],
          z: CAMERA_PRESETS[status].position[2],
          duration: 1.5,
          ease: "power2.inOut",
        }, 0)
      } else if (status === "analyzing") {
        skullClipTriggered.current = false
        isCameraOverride.current = false
        orbitAngle.current = Math.atan2(1.5, 3)
        zoomLevel.current = Math.hypot(1.5, 3)
        currentTarget.current.set(...CAMERA_PRESETS.analyzing.target)
        camera.position.set(...CAMERA_PRESETS.analyzing.position)
        if ('fov' in camera) {
          camera.fov = 45
          camera.updateProjectionMatrix()
        }
      } else {
        isCameraOverride.current = true
        currentTarget.current.set(...CAMERA_PRESETS[status].target)
        if ('fov' in camera) {
          tl.to(camera, { fov: 45, duration: 1.5, ease: "power2.inOut", onUpdate: () => camera.updateProjectionMatrix() }, 0)
        }
        tl.to(camera.position, {
          x: CAMERA_PRESETS[status].position[0],
          y: CAMERA_PRESETS[status].position[1],
          z: CAMERA_PRESETS[status].position[2],
          duration: 1.5,
          ease: "power2.inOut",
        }, 0)
      }
    })
    return () => {
      if (shakeIntervalRef.current !== null) {
        window.clearInterval(shakeIntervalRef.current)
      }
      if (shakeSettleTimeoutRef.current !== null) {
        window.clearTimeout(shakeSettleTimeoutRef.current)
      }
      if (skullClipReturnTimeoutRef.current !== null) {
        window.clearTimeout(skullClipReturnTimeoutRef.current)
      }
      unsub()
    }
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
            skullClipReturnTimeoutRef.current = window.setTimeout(() => {
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
              skullClipReturnTimeoutRef.current = null
            }, CAMERA.SKULL_CLIP_RETURN_DELAY_S * 1000)
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
