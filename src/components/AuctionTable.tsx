'use client'
import { useAuctionStore } from '@/store/useAuctionStore'

const AMOUNTS = [5,10,15,20,50]

export default function AuctionTable(){
  const participants = useAuctionStore(s=> s.participants)
  const addBid = useAuctionStore(s=> s.addBid)

  if (participants.size === 0) return null

  return (
    <div className="mt-4">
      <table className="tbl w-full" aria-live="polite">
        <thead>
          <tr>
            <th>Participant</th>
            <th>Contribution ($)</th>
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
  const addBid = useAuctionStore(s=> s.addBid)
  const def = useAuctionStore(s=> s.defaultCustom)
  return (
    <button className="btn px-3 py-2 bg-[var(--neon)] text-neutral-900 shadow-neon hover:shadow-neonHover rounded-lg" onClick={()=>{ if(!addBid(name, def)) alert('Minimum is $5') }}>+Custom ${def}</button>
  )
}
