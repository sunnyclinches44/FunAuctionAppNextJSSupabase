import { memo } from 'react'

interface SessionHeaderProps {
  title?: string
  rtReady: boolean
}

const SessionHeader = memo(function SessionHeader({ title, rtReady }: SessionHeaderProps) {
  return (
    <header className="text-center pt-6">
      <h1 className="text-3xl sm:text-4xl font-extrabold grand">🙏 Fun Auction</h1>
      <div className="text-slate-400 mt-1">{title || 'Live Session'}</div>
      <div className={`mt-2 text-xs ${rtReady ? 'text-green-400' : 'text-slate-500'}`}>
        Realtime: {rtReady ? 'connected' : 'connecting…'}
      </div>
    </header>
  )
})

export default SessionHeader
