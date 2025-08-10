'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import Particles from '@/components/Particles'
import Toolbar from '@/components/Toolbar'
import Chips from '@/components/Chips'
import AuctionCards from '@/components/AuctionTable' // your updated mobile cards
import CustomAmountBar from '@/components/CustomAmountBar'
import ControlsBar from '@/components/ControlsBar'
import { useAuctionStore } from '@/store/useAuctionStore'
import UserBar from '@/components/UserBar'

export default function Page(){
  const { user, loading } = useAuth()
  const total = useAuctionStore(s=> s.total())
  const [festive, setFestive] = useState(true)
  const [theme, setTheme] = useState<'dark'|'light'>('dark')

  useEffect(()=>{ document.body.setAttribute('data-theme', theme) }, [theme])

  if (loading) return null   // or a spinner
  if (!user) {
    const SignInCard = require('@/components/SignInCard').default
    return (
      <main className="relative z-10">
        <Particles enabled={festive} />
        <header className="text-center pt-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold grand">🙏 Ganesh Chaturthi Laddu Auction</h1>
          <div className="text-slate-400 mt-1">Fun • Devotional • Everyone contributes</div>
        </header>
        <SignInCard />
      </main>
    )
  }

  // Signed-in view (unchanged auction)
  function toggleTheme(){ setTheme(theme==='dark'?'light':'dark') }
  function toggleFestive(){ setFestive(v=>!v) }

  return (
    <main className="relative z-10">
      <Particles enabled={festive} />
      <header className="text-center pt-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold grand">🙏 Ganesh Chaturthi Laddu Auction</h1>
        <div className="text-slate-400 mt-1">Fun • Devotional • Everyone contributes</div>
      </header>

      <UserBar />

      <section className="max-w-5xl mx-auto p-4 pb-28">
        <div className="card p-4">
          <Toolbar onTheme={toggleTheme} onFestive={toggleFestive} />
          <Chips />
          <AuctionCards />
          <CustomAmountBar />
          <ControlsBar />
        </div>
      </section>

      <div className="stickyTotal">
        <div className="w-full max-w-5xl flex items-center justify-between p-3">
          <div className="text-slate-400">Grand Total</div>
          <div className="grand text-2xl">${total}</div>
        </div>
      </div>
    </main>
  )
}
