'use client'

import { useState } from 'react'
import { ROUNDS, FINAL_ROUND, normalizeRound } from '@/lib/constants'

interface RoundControlProps {
  sessionCode: string
  currentRound: number
  onChangeRound: (sessionCode: string, round: number) => Promise<boolean>
}

function amountsLabel(index: number): string {
  const round = ROUNDS[index]
  if (round.custom) return 'Any amount, $5 to $10,000'
  // Cumulative: show everything a bidder can press once this round opens.
  const cumulative = ROUNDS.slice(0, index + 1).flatMap(r => [...r.unlocks])
  return cumulative.map(a => `$${a}`).join(' · ')
}

export default function RoundControl({
  sessionCode,
  currentRound,
  onChangeRound
}: RoundControlProps) {
  const [busy, setBusy] = useState(false)
  const current = normalizeRound(currentRound)
  const nextRound = current < FINAL_ROUND ? current + 1 : null

  const change = async (round: number, needsConfirm: boolean) => {
    if (needsConfirm && !confirm(
      `Go back to round ${round}? Bidders will lose the buttons round ${current} unlocked.`
    )) {
      return
    }

    setBusy(true)
    try {
      await onChangeRound(sessionCode, round)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-4 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label">Round control</span>
        <span className="num text-sm text-ink-3">Round {current} of {FINAL_ROUND}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {ROUNDS.map((round, index) => {
          const done = round.n < current
          const now = round.n === current
          return (
            <div
              key={round.n}
              className={`p-3 rounded border flex flex-col gap-1 ${
                now
                  ? 'border-accent bg-paper'
                  : 'border-hairline bg-paper'
              }`}
            >
              <span className="display text-[0.95rem]">
                Round {round.n} · {round.name}
              </span>
              <span className="num text-xs text-ink-2">{amountsLabel(index)}</span>
              <span className={`text-xs ${now ? 'text-accent' : 'text-ink-3'}`}>
                {now ? 'Live now' : done ? 'Finished' : 'Not started'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {nextRound ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => change(nextRound, false)}
          >
            {busy ? 'Opening…' : `Open round ${nextRound}`}
          </button>
        ) : (
          <span className="text-sm text-ink-3 self-center">
            The final round is open. Bidders can name any amount.
          </span>
        )}

        {current > 1 && (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => change(current - 1, true)}
          >
            Back to round {current - 1}
          </button>
        )}
      </div>
    </div>
  )
}
