'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <header className="text-center mb-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold grand">
          🙏 Fun Auction
        </h1>
        <p className="text-slate-400 mt-1">Fun • Devotional • Everyone contributes</p>
      </header>

      {/* Main action button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => router.push('/join')}
          className="btn btn-primary px-8 py-4 text-lg"
        >
          Join Session
        </button>
      </div>
    </main>
  )
}