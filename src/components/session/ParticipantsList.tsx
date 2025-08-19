import { memo } from 'react'
import { Participant } from '@/hooks/useSession'
import { AUCTION_CONFIG } from '@/lib/constants'

interface ParticipantsListProps {
  participants: Participant[]
  currentDeviceId: string
  onPlaceBid: (amount: number, participantId: string) => Promise<boolean>
  onCustomBid: (participantId: string) => void
  isPlacingBid: string | null
  showCustomInput: string | null
  customAmount: string
  onCustomAmountChange: (amount: string) => void
  onCustomAmountSubmit: (participantId: string) => void
  onCustomAmountCancel: () => void
}

const ParticipantsList = memo(function ParticipantsList({
  participants,
  currentDeviceId,
  onPlaceBid,
  onCustomBid,
  isPlacingBid,
  showCustomInput,
  customAmount,
  onCustomAmountChange,
  onCustomAmountSubmit,
  onCustomAmountCancel
}: ParticipantsListProps) {
  const { PRESET_AMOUNTS, MIN_BID_AMOUNT } = AUCTION_CONFIG

  // Find the highest bidder
  const highestBidder = participants.reduce((highest, current) => 
    Number(current.amount || 0) > Number(highest.amount || 0) ? current : highest
  , participants[0])

  // Sort participants by amount for ranking
  const sortedParticipants = [...participants].sort((a, b) => 
    Number(b.amount || 0) - Number(a.amount || 0)
  )

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center text-slate-300">Participants</h3>
      
      {participants.map((p) => {
        const isSelf = p.device_id && p.device_id === currentDeviceId
        const isHighestBidder = p.id === highestBidder?.id
        const rank = sortedParticipants.findIndex(participant => participant.id === p.id) + 1
        const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
        
        return (
          <div
            key={p.id}
            className={`p-4 rounded-xl border transition-all duration-300 ${
              isHighestBidder
                ? 'bg-gradient-to-r from-amber-900/50 to-yellow-800/50 border-amber-500/60 shadow-lg shadow-amber-500/20 highest-bidder-card'
                : isSelf
                ? 'bg-slate-800/50 border-slate-600'
                : 'bg-slate-800/30 border-slate-600'
            }`}
          >
            {/* Highest Bidder Badge */}
            {isHighestBidder && (
              <div className="flex items-center justify-center mb-3">
                <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 px-3 py-1 rounded-full text-sm font-bold shadow-lg trophy-badge">
                  <span className="text-lg">🏆</span>
                  <span>Highest Bidder</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`text-lg font-semibold ${isHighestBidder ? 'text-amber-200' : ''}`}>
                  {p.display_name}
                </div>
                {isHighestBidder && (
                  <span className="text-2xl crown-animation">👑</span>
                )}
                {/* Position indicator */}
                <span className={`text-sm px-2 py-1 rounded-full position-bounce ${
                  rank === 1 ? 'bg-yellow-500/20 text-yellow-300' :
                  rank === 2 ? 'bg-gray-500/20 text-gray-300' :
                  rank === 3 ? 'bg-amber-600/20 text-amber-300' :
                  'bg-slate-500/20 text-slate-300'
                }`}>
                  {rankEmoji}
                </span>
              </div>
              <div className="text-slate-400 hidden sm:block">Bid</div>
            </div>
            
            <div className={`mt-1 text-2xl font-extrabold ${
              isHighestBidder ? 'text-amber-300' : ''
            }`}>
              ${Number(p.amount || 0)}
            </div>

            {/* Progress bar showing relative position to highest bidder */}
            {highestBidder && highestBidder.amount > 0 && (
              <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    isHighestBidder 
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-400' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-500'
                  }`}
                  style={{ 
                    width: `${Math.min((Number(p.amount || 0) / Number(highestBidder.amount)) * 100, 100)}%` 
                  }}
                />
              </div>
            )}

            {/* Only show bid buttons for current user */}
            {isSelf && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-start">
                {PRESET_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    disabled={isPlacingBid === p.id}
                    className={`btn px-3 py-2 rounded-lg ${
                      isPlacingBid !== p.id
                        ? 'bg-[var(--neon)] text-neutral-900 shadow-neon hover:shadow-neonHover'
                        : 'bg-white/10 text-slate-400 cursor-not-allowed'
                    }`}
                    onClick={() => onPlaceBid(a, p.id)}
                  >
                    {isPlacingBid === p.id ? '...' : `+$${a}`}
                  </button>
                ))}
                
                {/* Custom Amount Button */}
                <button
                  disabled={isPlacingBid === p.id}
                  className={`btn px-3 py-2 rounded-lg ${
                    isPlacingBid !== p.id
                      ? 'bg-[var(--neon)] text-neutral-900 shadow-neon hover:shadow-neonHover'
                      : 'bg-white/10 text-slate-400 cursor-not-allowed'
                  }`}
                  onClick={() => onCustomBid(p.id)}
                >
                  Custom
                </button>
              </div>
            )}

            {/* Custom Amount Modal - only show for current user */}
            {isSelf && showCustomInput === p.id && (
              <div className="mt-4 p-4 bg-slate-800/50 border border-slate-600 rounded-xl backdrop-blur-sm">
                <div className="text-sm text-slate-300 mb-3">Enter custom amount (≥ $5)</div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min={MIN_BID_AMOUNT}
                    step="1"
                    value={customAmount}
                    onChange={(e) => onCustomAmountChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onCustomAmountSubmit(p.id)
                      } else if (e.key === 'Escape') {
                        onCustomAmountCancel()
                      }
                    }}
                    placeholder="Enter amount..."
                    className="flex-1 bg-white/10 border border-slate-500 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    autoFocus
                  />
                  <button
                    onClick={() => onCustomAmountSubmit(p.id)}
                    disabled={!customAmount || Number(customAmount) < MIN_BID_AMOUNT}
                    className={`btn px-3 py-2 rounded-lg ${
                      customAmount && Number(customAmount) >= MIN_BID_AMOUNT
                        ? 'bg-[var(--neon)] text-neutral-900 shadow-neon hover:shadow-neonHover'
                        : 'bg-white/10 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Add
                  </button>
                  <button
                    onClick={onCustomAmountCancel}
                    className="btn bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
})

export default ParticipantsList
