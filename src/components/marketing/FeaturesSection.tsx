'use client'

import { useRouter } from 'next/navigation'

export default function FeaturesSection() {
  const router = useRouter()

  const features = [
    {
      title: 'Live on every screen',
      description:
        'Bids, totals and the leaderboard update the moment someone taps, with no refresh.'
    },
    {
      title: 'Nothing to install',
      description:
        'Participants join in a browser with a code. No account, no app, no download.'
    },
    {
      title: 'Rounds you control',
      description:
        'Open each round when the room is warm. Higher amounts unlock as you go.'
    },
    {
      title: 'Built for a phone',
      description:
        'Large tap targets and one clear action per screen, for a crowded hall.'
    },
    {
      title: 'A mistake is undoable',
      description:
        'Anyone can take back their last bid, and you can remove a bidder entirely.'
    },
    {
      title: 'Numbers for the follow-up',
      description:
        'Mobile numbers sit in your admin view only, ready for collecting pledges afterwards.'
    }
  ]

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-hairline">
      <div className="flex flex-col gap-2 mb-10">
        <span className="label">What you get</span>
        <h2 className="text-2xl sm:text-3xl">Enough to run the night, and no more</h2>
      </div>

      <div className="grid gap-px bg-hairline border border-hairline sm:grid-cols-2">
        {features.map((feature) => (
          <div key={feature.title} className="bg-ivory p-5 flex flex-col gap-2">
            <h3 className="text-base">{feature.title}</h3>
            <p className="text-sm text-ink-2 m-0">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col sm:flex-row gap-3">
        <button onClick={() => router.push('/create')} className="btn btn-primary">
          Create a session
        </button>
        <button onClick={() => router.push('/join')} className="btn btn-ghost">
          I have a code
        </button>
      </div>
    </section>
  )
}
