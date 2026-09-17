'use client'

import { useRouter } from 'next/navigation'
import { ROUNDS } from '@/lib/constants'

export default function HeroSection() {
  const router = useRouter()

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
      <div className="flex flex-col gap-6">
        <span className="label">Real-time group bidding</span>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl">
          An auction the whole room can play.
        </h1>

        <p className="text-lg sm:text-xl text-ink-2 max-w-2xl m-0">
          Built for temple events, charity nights and community fundraisers.
          The organiser opens a session, everyone joins from their phone with a
          code, and the bids land live on every screen.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button onClick={() => router.push('/join')} className="btn btn-primary">
            Join a session
          </button>
          <button onClick={() => router.push('/create')} className="btn">
            Create a session
          </button>
        </div>
      </div>

      {/* The round ladder is what makes this different from a donation form,
          so it opens the page. Deliberately no amount table: a participant is
          one nav click from here, and the unlock is meant to surprise them. */}
      <div className="mt-14 pt-8 border-t border-hairline">
        <span className="label">Three rounds, rising stakes</span>
        <ol className="grid gap-px bg-hairline border border-hairline mt-4 sm:grid-cols-3 list-none p-0">
          {ROUNDS.map((round) => (
            <li key={round.n} className="bg-ivory p-5 flex flex-col gap-2">
              <span className="num text-sm text-ink-3">Round {round.n}</span>
              <span className="display text-lg">{round.name}</span>
              <span className="text-sm text-ink-2">{round.blurb}</span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-ink-3 mt-4 m-0">
          Bidders only ever see the amounts their current round has unlocked. When
          you open the next one, the bigger buttons appear on every phone at once.
        </p>
      </div>
    </section>
  )
}
