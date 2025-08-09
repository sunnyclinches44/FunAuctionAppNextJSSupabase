'use client'
import { useEffect, useState } from 'react'
import Toolbar from '@/components/Toolbar'
import Chips from '@/components/Chips'
import AuctionTable from '@/components/AuctionTable'
import CustomAmountBar from '@/components/CustomAmountBar'
import ControlsBar from '@/components/ControlsBar'
import Particles from '@/components/Particles'
import { useAuctionStore } from '@/store/useAuctionStore'

export default function Page(){
  const total = useAuctionStore(s=> s.total())
  const [festive, setFestive] = useState(true)
  const [theme, setTheme] = useState<'dark'|'light'>('dark')

  useEffect(()=>{ const s = localStorage.getItem('laddu_theme'); if(s==='light'||s==='dark') setTheme(s as any) }, [])
  useEffect(()=>{ const s = localStorage.getItem('laddu_particles'); if(s) setFestive(s==='1') }, [])

  function toggleTheme(){
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next); localStorage.setItem('laddu_theme', next)
    document.body.setAttribute('data-theme', next)
  }
  function toggleFestive(){ const v = !festive; setFestive(v); localStorage.setItem('laddu_particles', v ? '1' : '0') }

  useEffect(()=>{ document.body.setAttribute('data-theme', theme) }, [theme])

  return (
    <main className="relative z-10">
      <Particles enabled={festive} />
      <header className="text-center pt-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold grand">🙏 Ganesh Chaturthi Laddu Auction</h1>
        <div className="text-slate-400 mt-1">Fun • Devotional • Everyone contributes</div>
      </header>

      <section className="max-w-5xl mx-auto p-4 pb-28">
        <div className="card p-4">
          <Toolbar onTheme={toggleTheme} onFestive={toggleFestive} />
          <Chips />
          <AuctionTable />
          <CustomAmountBar />
          <ControlsBar />
        </div>
      </section>

      {/* Sticky Total */}
      <div className="stickyTotal">
        <div className="w-full max-w-5xl flex items-center justify-between p-3">
          <div className="text-slate-400">Grand Total</div>
          <div className="grand text-2xl">${total}</div>
        </div>
      </div>
    </main>
  )
}
