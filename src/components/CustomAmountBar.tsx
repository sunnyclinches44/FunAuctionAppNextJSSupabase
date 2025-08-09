'use client'
import { useAuctionStore } from '@/store/useAuctionStore'
import { useState } from 'react'

export default function CustomAmountBar(){
  const [v, setV] = useState('')
  const def = useAuctionStore(s=> s.defaultCustom)
  const setDef = useAuctionStore.setState

  function apply(){
    const num = Number(v)
    if(!Number.isFinite(num) || num < 5){ alert('Enter a valid number ≥ 5'); return }
    if(num % 5 !== 0 && !confirm('Amounts usually step by 5. Use anyway?')) return
    setDef({ defaultCustom: num })
    setV('')
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mt-3">
      <input value={v} onChange={e=>setV(e.target.value)} placeholder="Custom amount (≥ $5)" className="min-w-[220px] flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 outline-none" />
      <button onClick={apply} className="btn btn-ghost px-4 py-2">Set default custom</button>
      <span className="text-slate-400">Default custom: ${def}</span>
    </div>
  )
}
