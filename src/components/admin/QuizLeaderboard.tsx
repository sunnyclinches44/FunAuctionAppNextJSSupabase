import { memo } from 'react'
import { scoreLine, type AdminLeaderboardRow } from '@/lib/quiz'

interface QuizLeaderboardProps {
  rows: AdminLeaderboardRow[]
  /** Questions revealed so far; the denominator. */
  outOf: number
}

/**
 * Everyone's score. Organiser only: this is the view the phones never get,
 * so nobody in the room sees how anyone else did.
 */
const QuizLeaderboard = memo(function QuizLeaderboard({ rows, outOf }: QuizLeaderboardProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink-3 m-0 py-2">Nobody has joined the session yet.</p>
  }

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[1.5rem_1fr_auto_auto] items-baseline gap-3 pb-2 border-b border-hairline">
        <span className="label" aria-hidden="true" />
        <span className="label">Name</span>
        <span className="label">Right</span>
        <span className="label">Fastest</span>
      </div>
      {rows.map((row, index) => {
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
            <span className="num text-sm text-ink-3 text-right" title="Questions where this person was the first correct answer">
              {row.fastest_wins > 0 ? `${row.fastest_wins}×` : '–'}
            </span>
          </div>
        )
      })}
    </div>
  )
})

export default QuizLeaderboard
