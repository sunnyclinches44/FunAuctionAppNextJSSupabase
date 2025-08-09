'use client'
import { useAuctionStore } from '@/store/useAuctionStore'

export default function Chips(){
  const participants = useAuctionStore(s=> s.participants)
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {Array.from(participants.entries()).map(([name, amt])=> (
        <div key={name} className="chip">
          <strong>{name}</strong>
          <span className="text-slate-400">${amt}</span>
        </div>
      ))}
    </div>
  )
}
