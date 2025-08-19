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
  ).slice(0, 3) // Only show top 3

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          badge: 'bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-500 text-yellow-900 shadow-lg shadow-yellow-500/50',
          card: 'bg-gradient-to-br from-amber-900/40 via-yellow-800/30 to-amber-800/40 border-amber-400/60',
          text: 'text-amber-200',
          amount: 'text-yellow-300',
          glow: 'shadow-2xl shadow-amber-500/30'
        }
      case 2:
        return {
          badge: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 text-gray-800 shadow-lg shadow-gray-500/50',
          card: 'bg-gradient-to-br from-gray-800/40 via-gray-700/30 to-gray-800/40 border-gray-400/60',
          text: 'text-gray-200',
          amount: 'text-gray-300',
          glow: 'shadow-xl shadow-gray-500/20'
        }
      case 3:
        return {
          badge: 'bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-amber-100 shadow-lg shadow-amber-600/50',
          card: 'bg-gradient-to-br from-amber-800/40 via-orange-700/30 to-amber-800/40 border-amber-500/60',
          text: 'text-amber-200',
          amount: 'text-orange-300',
          glow: 'shadow-lg shadow-amber-600/20'
        }
      default:
        return {
          badge: 'bg-slate-600 text-slate-200',
          card: 'bg-slate-800/40 border-slate-500/60',
          text: 'text-slate-200',
          amount: 'text-slate-300',
          glow: 'shadow-md'
        }
    }
  }

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return '🏅'
    }
  }

  const getRankTitle = (rank: number) => {
    switch (rank) {
      case 1: return 'Champion'
      case 2: return 'Runner Up'
      case 3: return 'Third Place'
      default: return 'Participant'
    }
  }

  return (
    <div className="bg-gradient-to-br from-slate-800/60 via-slate-700/40 to-slate-800/60 border border-slate-600/60 rounded-2xl p-4 mb-4 backdrop-blur-enhanced shadow-depth-4">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-3xl animate-pulse">🏆</span>
          <h3 className="text-2xl font-bold gradient-text">
            Leaderboard
          </h3>
          <span className="text-3xl animate-pulse">🏆</span>
        </div>
        <p className="text-slate-400 text-sm">Top performers in this auction</p>
      </div>
      
      {/* Leaderboard Cards */}
      <div className="grid grid-cols-1 gap-3 leaderboard-3d leaderboard-row-layout">
        {sortedParticipants.map((participant, index) => {
          const rank = index + 1
          const isFirst = rank === 1
          const rankStyles = getRankStyle(rank)
          
          return (
            <div
              key={participant.id}
              className={`group relative p-4 rounded-2xl border-2 transition-all duration-500 hover:scale-105 hover:-translate-y-2 leaderboard-card leaderboard-card-3d ${
                rankStyles.card
              } ${rankStyles.glow} ${isFirst ? 'highest-bidder-card' : ''}`}
            >
              {/* Rank Badge */}
              <div className={`absolute -top-2 -left-2 w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${rankStyles.badge} transition-transform duration-300 group-hover:scale-110 rank-badge-glow`}>
                {getRankEmoji(rank)}
              </div>
              
              {/* Rank Title */}
              <div className="text-center mb-3">
                <div className={`text-xs font-semibold uppercase tracking-wider ${rankStyles.text} opacity-80`}>
                  {getRankTitle(rank)}
                </div>
              </div>
              
              {/* Participant Info */}
              <div className="text-center">
                <div className={`text-lg font-bold mb-2 ${rankStyles.text} transition-colors duration-300`}>
                  {participant.display_name}
                </div>
                
                {/* Amount with enhanced styling */}
                <div className={`text-2xl font-black mb-2 ${rankStyles.amount} transition-all duration-300 group-hover:scale-110`}>
                  ${Number(participant.amount || 0).toLocaleString()}
                </div>
                
                {/* Special highlight for 1st place */}
                {isFirst && (
                  <div className="mt-3 p-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-lg border border-amber-400/30 animated-border">
                    <div className="text-xs text-amber-300 font-semibold flex items-center justify-center gap-1">
                      <span className="animate-bounce">🎉</span>
                      <span>Leading the Auction!</span>
                      <span className="animate-bounce">🎉</span>
                    </div>
                  </div>
                )}
                
                {/* Progress indicator for other ranks */}
                {!isFirst && (
                  <div className="mt-3">
                    <div className="text-xs text-slate-400 mb-1">Progress to 1st</div>
                    <div className="w-full bg-slate-700 rounded-full h-2 shadow-depth-1">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 progress-bar-animated ${
                          rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                        }`}
                        style={{ 
                          '--progress-width': `${Math.min((Number(participant.amount || 0) / Number(sortedParticipants[0]?.amount || 1)) * 100, 100)}%`,
                          width: `${Math.min((Number(participant.amount || 0) / Number(sortedParticipants[0]?.amount || 1)) * 100, 100)}%`
                        } as React.CSSProperties}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Decorative elements */}
              <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
                <span className="text-2xl">{getRankEmoji(rank)}</span>
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Total participants info with enhanced styling */}
      {participants.length > 3 && (
        <div className="text-center mt-4 p-3 bg-slate-700/30 rounded-xl border border-slate-600/40 shadow-depth-2">
          <div className="text-sm text-slate-300 font-medium">
            +{participants.length - 3} more participants competing
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Join the race to the top! 🚀
          </div>
        </div>
      )}
    </div>
  )
})

export default Leaderboard
