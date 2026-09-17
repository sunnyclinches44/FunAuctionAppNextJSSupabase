import { memo } from 'react'
import { ROUNDS, normalizeRound } from '@/lib/constants'

interface RoundRailProps {
  currentRound: number
  /** Admin-facing rails drop the "Live" pill, which belongs to the bidder view. */
  showLive?: boolean
}

function amountsLabel(roundNumber: number): string {
  const round = ROUNDS[roundNumber - 1]
  if (round.custom) return 'Any amount'
  return round.unlocks.map(a => `$${a}`).join(' · ')
}

const RoundRail = memo(function RoundRail({ currentRound, showLive = true }: RoundRailProps) {
  const current = normalizeRound(currentRound)
  const meta = ROUNDS[current - 1]

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="display text-base">
          Round {current} · {meta.name}
        </span>
        {showLive && (
          <span className="pill pill-live">
            <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
            Live
          </span>
        )}
      </div>

      <ol className="grid grid-cols-3 gap-1.5 list-none p-0 m-0">
        {ROUNDS.map((round) => {
          const done = round.n < current
          const now = round.n === current
          return (
            <li key={round.n} className="flex flex-col gap-1.5">
              <span
                className={`h-[3px] ${
                  now ? 'bg-accent' : done ? 'bg-ink-3' : 'bg-hairline'
                }`}
                aria-hidden="true"
              />
              <span
                className={`text-[0.68rem] uppercase tracking-[0.06em] ${
                  now ? 'text-accent font-medium' : 'text-ink-3'
                }`}
              >
                {round.name}
              </span>
              <span className={`num text-[0.72rem] ${now ? 'text-ink' : 'text-ink-3'}`}>
                {amountsLabel(round.n)}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="text-sm text-ink-3 m-0">{meta.blurb}</p>
    </div>
  )
})

export default RoundRail
