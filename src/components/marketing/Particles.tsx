'use client'
import { useEffect, useRef } from 'react'

export default function Particles({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!enabled || reduced) return
    const count = Math.min(24, Math.max(12, Math.floor(window.innerWidth / 50)))
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span')
      s.textContent = '🪔'
      s.className = 'p'
      const left = Math.random() * 100
      const duration = 8 + Math.random() * 10
      const delay = Math.random() * -20
      const size = 16 + Math.random() * 10
      ;(s.style as any).left = left + 'vw'
      s.style.animationDuration = duration + 's'
      s.style.animationDelay = delay + 's'
      s.style.fontSize = size + 'px'
      s.style.opacity = (0.12 + Math.random() * 0.18).toFixed(2)
      el.appendChild(s)
    }
  }, [enabled])
  return <div ref={ref} className="particles" aria-hidden />
}
