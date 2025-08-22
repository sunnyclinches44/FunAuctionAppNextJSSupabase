import { memo } from 'react'
import { Participant } from '@/store/useSessionStore'

interface LeaderboardProps {
  participants: Participant[]
}

const Leaderboard = memo(function Leaderboard({ participants }: LeaderboardProps) {
  if (participants.length === 0) return null

  // Sort participants by amount (highest first)
  const sortedParticipants = [...participants].sort((a, b) => 
    Number(b.amount || 0) - Number(a.amount || 0)
  ).slice(0, 5) // Show top 5 for better competition

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          badge: 'bg-gradient-to-br from-yellow-400 to-amber-500 text-yellow-900',
          row: 'bg-gradient-to-r from-amber-900/30 to-yellow-800/20 border-amber-400/40',
          text: 'text-amber-200',
          amount: 'text-yellow-300'
        }
      case 2:
        return {
          badge: 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-800',
          row: 'bg-gradient-to-r from-gray-800/30 to-gray-700/20 border-gray-400/40',
          text: 'text-gray-200',
          amount: 'text-gray-300'
        }
      case 3:
        return {
          badge: 'bg-gradient-to-br from-amber-600 to-orange-600 text-amber-100',
          row: 'bg-gradient-to-r from-amber-800/30 to-orange-700/20 border-amber-500/40',
          text: 'text-amber-200',
          amount: 'text-orange-300'
        }
      default:
        return {
          badge: 'bg-slate-600 text-slate-200',
          row: 'bg-slate-800/20 border-slate-600/40',
          text: 'text-slate-200',
          amount: 'text-slate-300'
        }
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      case 4: return '🏅'
      case 5: return '🏅'
      default: return '🏅'
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/60 via-slate-700/40 to-slate-800/60 border border-slate-600/60 rounded-2xl p-4 backdrop-blur-sm">
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-slate-200 mb-1">Leaderboard</h3>
        <p className="text-slate-400 text-sm">Top performers in this auction</p>
      </div>
      
      {/* Compact Table Layout */}
      <div className="space-y-2">
        {/* Participant Rows */}
        {sortedParticipants.map((participant, index) => {
          const rank = index + 1
          const rankStyles = getRankStyle(rank)
          
          return (
            <div
              key={participant.id}
              className={`group grid grid-cols-12 gap-2 px-3 py-3 rounded-xl border transition-all duration-200 hover:scale-[1.02] ${rankStyles.row}`}
            >
              {/* Rank Badge */}
              <div className="col-span-3 flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${rankStyles.badge} shadow-lg`}>
                  {getRankIcon(rank)}
                </div>
              </div>
              
              {/* Participant Name */}
              <div className="col-span-6 flex items-center">
                <div className={`font-semibold ${rankStyles.text} truncate`}>
                  {participant.display_name}
                </div>
              </div>
              
              {/* Amount */}
              <div className="col-span-3 flex items-center justify-end">
                <div className={`font-bold text-lg ${rankStyles.amount}`}>
                  ${Number(participant.amount || 0).toLocaleString()}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Total participants info */}
      {participants.length > 5 && (
        <div className="text-center mt-4 p-3 bg-slate-700/30 rounded-xl border border-slate-600/40">
          <div className="text-sm text-slate-300 font-medium">
            +{participants.length - 5} more participants competing
          </div>
        </div>
      )}
    </div>
  )
})

export default Leaderboard
