'use client'

import { memo, useState } from 'react'
import { scoreLine, type AdminLeaderboardRow } from '@/lib/quiz'

interface QuizLeaderboardProps {
  rows: AdminLeaderboardRow[]
  /** Questions revealed so far; the denominator. */
  outOf: number
}

/**
 * Everyone's score. Organiser only: this is the view the phones never get,
 * so nobody in the room sees how anyone else did.
 *
 * The winner stands alone until asked otherwise. With fifty people the full
 * table is a wall of names in a scrolling box, and the one row that matters
 * while the quiz is running is the top one.
 */
const QuizLeaderboard = memo(function QuizLeaderboard({ rows, outOf }: QuizLeaderboardProps) {
  const [showAll, setShowAll] = useState(false)

  if (rows.length === 0) {
    return <p className="text-sm text-ink-3 m-0 py-2">Nobody has joined the session yet.</p>
  }

  const visible = showAll ? rows : rows.slice(0, 1)

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[1.5rem_1fr_auto_auto] items-baseline gap-3 pb-2 border-b border-hairline">
        <span className="label" aria-hidden="true" />
        <span className="label">Name</span>
        <span className="label">Right</span>
        <span className="label" title="Questions this person answered first, correctly">Fastest</span>
      </div>
      {visible.map((row, index) => {
        const rank = index + 1
        const lead = rank === 1 && row.correct > 0
        return (
          <div
            key={row.participant_id}
            className="grid grid-cols-[1.5rem_1fr_auto_auto] items-center gap-3 py-2.5 border-b border-hairline last:border-b-0"
          >
            <span className={`num text-sm ${lead ? 'text-accent' : 'text-ink-3'}`}>{rank}</span>
            <span className={`text-[0.9rem] truncate ${lead ? 'text-ink font-medium' : 'text-ink'}`}>
              {row.display_name}
            </span>
            <span className={`num text-[0.9rem] ${lead ? 'text-accent' : 'text-ink'}`}>
              {scoreLine(row.correct, outOf)}
            </span>
            <span
              className="num text-sm text-ink-3 text-right"
              title="Questions where this person was the first correct answer"
            >
              {row.fastest_wins > 0 ? `${row.fastest_wins}×` : '–'}
            </span>
          </div>
        )
      })}
      {rows.length > 1 && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="self-start mt-2 text-sm text-ink-3 hover:text-accent underline underline-offset-4 bg-transparent border-0 p-0 cursor-pointer"
        >
          {showAll ? 'Show the winner only' : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  )
})

export default QuizLeaderboard
