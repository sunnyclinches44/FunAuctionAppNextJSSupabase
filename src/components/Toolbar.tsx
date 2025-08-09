'use client'
import { useState } from 'react'
import { useAuctionStore } from '@/store/useAuctionStore'

export default function Toolbar({ onTheme, onFestive }: { onTheme: () => void; onFestive: () => void }) {
  const [name, setName] = useState('')
  const addParticipant = useAuctionStore(s => s.addParticipant)

  function submit() {
    const ok = addParticipant(name)
    if (!ok) { alert('Enter a new participant (not duplicate).'); return }
    setName('')
  }

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <input
            value={name}
            onChange={(e)=>setName(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==='Enter') submit() }}
            placeholder="Add participant name"
            aria-label="Participant name"
            className="flex-1 min-w-[220px] bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 outline-none"
          />
          <button onClick={submit} className="btn btn-primary px-4 py-2">➕ Add Participant</button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onTheme} className="btn btn-ghost px-4 py-2">🌓 Theme</button>
          <button onClick={onFestive} className="btn btn-ghost px-4 py-2">✨ Festive</button>
        </div>
      </div>
    </div>
  )
}
