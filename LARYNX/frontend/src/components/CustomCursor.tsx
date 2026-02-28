import { useEffect, useRef } from 'react'

export function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })
  const hovering = useRef(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      target.current.x = e.clientX
      target.current.y = e.clientY
    }

    const handleMouseOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      hovering.current = !!(el.closest('button') || el.closest('a') || el.closest('[data-interactive]') || el.closest('input') || el.closest('label'))
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseover', handleMouseOver)
    
    // Animation loop with spring physics
    let raf: number
    const animate = () => {
      // Outer ring follows with delay (spring)
      pos.current.x += (target.current.x - pos.current.x) * 0.08
      pos.current.y += (target.current.y - pos.current.y) * 0.08
      
      if (outerRef.current) {
        outerRef.current.style.transform = `translate(${pos.current.x - 20}px, ${pos.current.y - 20}px) scale(${hovering.current ? 1.5 : 1})`
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
          border: '1px solid rgba(0, 255, 255, 0.4)',
          borderRadius: '50%',
          transition: 'width 0.3s, height 0.3s, border-color 0.3s',
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
          backgroundColor: '#00FFFF',
          boxShadow: '0 0 6px rgba(0, 255, 255, 0.6)',
        }}
      />
    </>
  )
}
