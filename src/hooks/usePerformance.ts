import { useEffect, useRef } from 'react'

interface PerformanceMetrics {
  renderCount: number
  lastRenderTime: number
  averageRenderTime: number
}

export function usePerformance(componentName: string) {
  const renderCount = useRef(0)
  const lastRenderTime = useRef(performance.now())
  const totalRenderTime = useRef(0)

  useEffect(() => {
    const startTime = performance.now()
    renderCount.current += 1
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      lastRenderTime.current = renderTime
      totalRenderTime.current += renderTime
      
      // Log performance metrics in development
      if (process.env.NODE_ENV === 'development') {
        const averageTime = totalRenderTime.current / renderCount.current
        
        console.log(`🚀 ${componentName} Performance:`, {
          renderCount: renderCount.current,
          lastRenderTime: `${renderTime.toFixed(2)}ms`,
          averageRenderTime: `${averageTime.toFixed(2)}ms`
        })
        
        // Warn if render time is too high
        if (renderTime > 16) { // 16ms = 60fps threshold
          console.warn(`⚠️ ${componentName} took ${renderTime.toFixed(2)}ms to render (above 60fps threshold)`)
        }
      }
    }
  })

  return {
    renderCount: renderCount.current,
    lastRenderTime: lastRenderTime.current,
    averageRenderTime: totalRenderTime.current / Math.max(renderCount.current, 1)
  }
}
