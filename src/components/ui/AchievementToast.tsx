import { memo, useEffect, useState } from 'react'

interface AchievementToastProps {
  message: string
  type: 'success' | 'achievement' | 'info'
  onClose: () => void
  duration?: number
}

const AchievementToast = memo(function AchievementToast({ 
  message, 
  type, 
  onClose, 
  duration = 4000 
}: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade out animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getToastStyle = () => {
    switch (type) {
      case 'achievement':
        return 'bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-900 border-amber-400 shadow-lg shadow-amber-500/30'
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-green-900 border-green-400 shadow-lg shadow-green-500/30'
      case 'info':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-blue-900 border-blue-400 shadow-lg shadow-blue-500/30'
      default:
        return 'bg-slate-600 text-slate-200 border-slate-500'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'achievement':
        return '🏆'
      case 'success':
        return '✅'
      case 'info':
        return 'ℹ️'
      default:
        return '💡'
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-2 duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 shadow-xl ${getToastStyle()}`}>
        <span className="text-xl">{getIcon()}</span>
        <span className="font-semibold">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="ml-2 text-current/70 hover:text-current transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
})

export default AchievementToast

