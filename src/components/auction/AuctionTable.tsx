'use client'
import { useAuctionStore } from '@/store/useAuctionStore'
import { useEffect, useRef, useState } from 'react'

const AMOUNTS = [5,10,15,20,50]

export default function AuctionTable(){
  const participants = useAuctionStore(s=> s.participants)
  const addBid = useAuctionStore(s=> s.addBid)

  if (participants.size === 0) return null

  return (
    <div className="mt-4">
      {/* Mobile: stacked cards with buttons below each participant */}
      <div className="sm:hidden space-y-3">
        {Array.from(participants.entries()).map(([name, amt]) => (
          <div key={name} className="card p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{name}</div>
              <div className="text-sm text-slate-400">Bid</div>
            </div>
            <div className="mt-1 text-xl">${amt}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {AMOUNTS.map(a => (
                <button
                  key={a}
                  className="btn px-3 py-2 text-sm bg-[var(--neon)] text-neutral-900 shadow-neon hover:shadow-neonHover rounded-lg"
                  onClick={()=>{ if(!addBid(name,a)) alert('Minimum is $5') }}
                >
                  +${a}
                </button>
              ))}
              <CustomQuick name={name} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop/Tablet: table layout */}
      <table className="tbl w-full hidden sm:table" aria-live="polite">
        <thead>
          <tr>
            <th>Participant</th>
            <th>Bid ($)</th>
            <th className="text-right">Quick Add</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(participants.entries()).map(([name, amt])=> (
            <tr key={name}>
              <td>{name}</td>
              <td>${amt}</td>
              <td className="text-right">
                <div className="flex flex-wrap gap-2 justify-end">
                  {AMOUNTS.map(a=> (
                    <button key={a} className="btn px-3 py-2 bg-[var(--neon)] text-neutral-900 shadow-neon hover:shadow-neonHover rounded-lg" onClick={()=>{ if(!addBid(name,a)) alert('Minimum is $5') }}>+${a}</button>
                  ))}
                  <CustomQuick name={name} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CustomQuick({ name }: { name: string }){
  const addBid = useAuctionStore(s => s.addBid)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function apply() {
    const num = Number(value)
    if (!Number.isFinite(num) || num < 5) { alert('Enter a valid number ≥ 5'); return }
    if (!addBid(name, num)) { alert('Minimum is $5'); return }
    setValue('')
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        className="btn px-3 py-2 text-sm bg-[var(--neon)] text-neutral-900 shadow-neon hover:shadow-neonHover rounded-lg"
        onClick={() => setEditing(true)}
      >
        +Custom
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') apply(); if (e.key === 'Escape') setEditing(false) }}
        placeholder="$ Amount"
        inputMode="numeric"
        className="w-24 bg-white/5 border border-[var(--border)] rounded-lg px-2 py-1 outline-none"
        aria-label={`Enter custom amount for ${name}`}
      />
      <button className="btn btn-primary px-3 py-1 text-sm" onClick={apply}>Add</button>
      <button className="btn btn-ghost px-2 py-1 text-sm" onClick={() => { setEditing(false); setValue('') }}>Cancel</button>
    </div>
  )
}
