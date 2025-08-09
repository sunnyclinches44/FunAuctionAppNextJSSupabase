'use client'
import { useAuctionStore } from '@/store/useAuctionStore'

export default function ControlsBar(){
  const undo = useAuctionStore(s=> s.undo)
  const reset = useAuctionStore(s=> s.reset)
  return (
    <div className="flex items-center gap-3 mt-3">
      <button onClick={undo} className="btn btn-ghost px-4 py-2">Undo last bid</button>
      <button onClick={reset} className="btn btn-ghost px-4 py-2">Reset session</button>
      <span className="text-slate-400 ml-auto">Session only. No database.</span>
    </div>
  )
}
