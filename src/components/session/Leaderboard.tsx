import { memo } from 'react'
import { Participant } from '@/store/useSessionStore'

interface LeaderboardProps {
  participants: Participant[]
}

const Leaderboard = memo(function Leaderboard({ participants }: LeaderboardProps) {
  if (participants.length === 0) {
    return <p className="text-sm text-ink-3 m-0 py-2">No bids yet.</p>
  }

  const top = [...participants]
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
    .slice(0, 5)

  const leadAmount = Number(top[0]?.amount || 0)

  return (
    <div className="flex flex-col">
      {top.map((participant, index) => {
        const rank = index + 1
        const amount = Number(participant.amount || 0)
        const share = leadAmount > 0 ? (amount / leadAmount) * 100 : 0
        const isLeader = rank === 1

        return (
          <div
            key={participant.id}
            className="py-3 border-b border-hairline last:border-b-0 flex flex-col gap-2"
          >
            <div className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3">
              <span className={`num text-sm ${isLeader ? 'text-accent' : 'text-ink-3'}`}>
                {rank}
              </span>
              <span className={`text-[0.9rem] truncate ${isLeader ? 'text-ink font-medium' : 'text-ink'}`}>
                {participant.display_name}
              </span>
              <span className={`num text-[0.9rem] ${isLeader ? 'text-accent' : 'text-ink'}`}>
                ${amount.toLocaleString()}
              </span>
            </div>
            {/* Share of the leading total, so the gap is readable at a glance. */}
            <div className="h-[3px] bg-hairline" aria-hidden="true">
              <div
                className={`h-full transition-all duration-500 ${isLeader ? 'bg-accent' : 'bg-ink-3'}`}
                style={{ width: `${Math.min(share, 100)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
})

export default Leaderboard
