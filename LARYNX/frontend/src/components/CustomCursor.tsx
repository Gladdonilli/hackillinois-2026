import { useEffect, useRef } from 'react'

export function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0, y: 0, scale: 1, rot: 0 })
  const target = useRef({ x: 0, y: 0 })
  const hovering = useRef(false)
  const isInteractive = useRef(false)
  const isNavBtn = useRef(false)
  const isClicking = useRef(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      target.current.x = e.clientX
      target.current.y = e.clientY
    }

    const handleMouseOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      const interactiveEl = el.closest('[data-interactive]')
      const navBtnEl = el.closest('.nav-btn')
      const btnEl = el.closest('button') || el.closest('a') || el.closest('input') || el.closest('label')
      
      hovering.current = !!(interactiveEl || navBtnEl || btnEl)
      isInteractive.current = !!interactiveEl
      isNavBtn.current = !!navBtnEl
    }

    const handleMouseDown = () => {
      isClicking.current = true
      setTimeout(() => {
        isClicking.current = false
      }, 200)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseover', handleMouseOver)
    window.addEventListener('mousedown', handleMouseDown)
    
    // Animation loop with spring physics
    let raf: number
    const animate = () => {
      // Outer ring follows with delay (spring)
      pos.current.x += (target.current.x - pos.current.x) * 0.08
      pos.current.y += (target.current.y - pos.current.y) * 0.08
      
      const targetScale = isClicking.current ? 2.0 : (hovering.current ? 1.5 : 1)
      pos.current.scale += (targetScale - pos.current.scale) * 0.15

      if (isInteractive.current) {
        pos.current.rot += 3 // 180deg per sec
      }

      if (outerRef.current) {
        outerRef.current.style.transform = `translate(${pos.current.x - 20}px, ${pos.current.y - 20}px) scale(${pos.current.scale}) rotate(${pos.current.rot}deg)`
        
        outerRef.current.style.border = isInteractive.current ? '1.5px dashed rgba(56, 189, 248, 0.6)' : '1px solid rgba(56, 189, 248, 0.4)'
        outerRef.current.style.backgroundColor = isNavBtn.current ? 'rgba(56, 189, 248, 0.1)' : 'transparent'
      }
      if (innerRef.current) {
        innerRef.current.style.transform = `translate(${target.current.x - 3}px, ${target.current.y - 3}px) scale(${hovering.current ? 0.5 : 1})`
      }
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseover', handleMouseOver)
      window.removeEventListener('mousedown', handleMouseDown)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      {/* Outer ring — follows with spring delay */}
      <div
        ref={outerRef}
        className="fixed top-0 left-0 z-[10000] pointer-events-none"
        style={{
          width: 40,
          height: 40,
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '50%',
          transition: 'border-color 0.3s, background-color 0.3s, border-width 0.3s',
          mixBlendMode: 'difference',
        }}
      />
      {/* Inner dot — follows immediately */}
      <div
        ref={innerRef}
        className="fixed top-0 left-0 z-[10000] pointer-events-none"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: '#38BDF8',
          boxShadow: '0 0 6px rgba(56, 189, 248, 0.6)',
        }}
      />
    </>
  )
}
