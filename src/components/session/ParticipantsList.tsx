import { memo } from 'react'
import { Participant } from '@/store/useSessionStore'
import {
  AUCTION_CONFIG,
  FINAL_ROUND,
  amountsForRound,
  customAllowed,
  normalizeRound
} from '@/lib/constants'

interface ParticipantsListProps {
  participants: Participant[]
  currentDeviceId: string
  currentRound: number
  onPlaceBid: (amount: number, participantId: string) => Promise<boolean>
  onCustomBid: (participantId: string) => void
  onUndoBid: (participantId: string) => Promise<boolean>
  isPlacingBid: string | null
  showCustomInput: string | null
  customAmount: string
  onCustomAmountChange: (amount: string) => void
  onCustomAmountSubmit: (participantId: string) => void
  onCustomAmountCancel: () => void
}

function LockGlyph() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

const ParticipantsList = memo(function ParticipantsList({
  participants,
  currentDeviceId,
  currentRound,
  onPlaceBid,
  onCustomBid,
  onUndoBid,
  isPlacingBid,
  showCustomInput,
  customAmount,
  onCustomAmountChange,
  onCustomAmountSubmit,
  onCustomAmountCancel
}: ParticipantsListProps) {
  const { MIN_BID_AMOUNT, MAX_BID_AMOUNT } = AUCTION_CONFIG
  const round = normalizeRound(currentRound)
  const unlocked = amountsForRound(round)
  const canBidCustom = customAllowed(round)

  const ranked = [...participants].sort(
    (a, b) => Number(b.amount || 0) - Number(a.amount || 0)
  )
  const me = participants.find(p => p.device_id && p.device_id === currentDeviceId)
  const others = ranked.filter(p => p.id !== me?.id)
  const myRank = me ? ranked.findIndex(p => p.id === me.id) + 1 : 0
  const leaderId = ranked[0]?.id

  const canParticipantBid = (participantId: string) => isPlacingBid !== participantId

  const rankNote = (rank: number, total: number) => {
    if (total <= 1) return 'First one in'
    if (rank === 1) return 'Leading the room'
    return `${rank}${rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'} of ${total} bidders`
  }

  return (
    <div className="flex flex-col gap-6">
      {/* The bidder's own panel: the only place with bid controls. */}
      {me && (
        <div className="card-own p-4 flex flex-col gap-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[0.95rem] font-medium text-ink truncate">
                {me.display_name}
                <span className="pill pill-quiet ml-2 align-middle">You</span>
              </span>
              <span className="text-sm text-ink-3">{rankNote(myRank, ranked.length)}</span>
            </div>
            <span className="display text-3xl num leading-none shrink-0">
              ${Number(me.amount || 0).toLocaleString()}
            </span>
          </div>

          {/* Only what this round has unlocked. A bidder never sees the amounts
              a later round brings, so each round opens as a reveal rather than
              a countdown they can plan around. */}
          <div className="grid grid-cols-2 gap-2">
            {unlocked.map((amount) => {
              const busy = isPlacingBid === me.id
              return (
                <button
                  key={amount}
                  type="button"
                  disabled={busy}
                  onClick={() => onPlaceBid(amount, me.id)}
                  className="btn num"
                >
                  {busy ? '…' : `+$${amount}`}
                </button>
              )
            })}

            {canBidCustom && (
              <button
                type="button"
                disabled={isPlacingBid === me.id}
                onClick={() => onCustomBid(me.id)}
                className="btn btn-primary col-span-2"
              >
                {isPlacingBid === me.id ? '…' : 'Name your amount'}
              </button>
            )}
          </div>

          {round < FINAL_ROUND && (
            <p className="text-sm text-ink-3 flex items-baseline gap-1.5 m-0">
              <span className="shrink-0 translate-y-px"><LockGlyph /></span>
              <span>More opens up when the organiser starts round {round + 1}.</span>
            </p>
          )}

          {/* Custom amount */}
          {showCustomInput === me.id && (
            <div className="card p-4 flex flex-col gap-3 animate-rise">
              <label htmlFor="custom-amount" className="text-sm text-ink-2">
                How much would you like to add? ${MIN_BID_AMOUNT} to ${MAX_BID_AMOUNT.toLocaleString()}.
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="custom-amount"
                  type="number"
                  inputMode="numeric"
                  min={MIN_BID_AMOUNT}
                  max={MAX_BID_AMOUNT}
                  step="1"
                  value={customAmount}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || /^\d+$/.test(value)) {
                      onCustomAmountChange(value)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onCustomAmountSubmit(me.id)
                    else if (e.key === 'Escape') onCustomAmountCancel()
                    if (e.key === '.' || e.key === ',') e.preventDefault()
                  }}
                  placeholder="e.g. 75"
                  className="field num sm:flex-1"
                  autoFocus
                />
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onCustomAmountSubmit(me.id)}
                    disabled={!customAmount || Number(customAmount) < MIN_BID_AMOUNT}
                    className="btn btn-primary flex-1 sm:flex-none"
                  >
                    Add it
                  </button>
                  <button
                    type="button"
                    onClick={onCustomAmountCancel}
                    className="btn btn-ghost flex-1 sm:flex-none"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {Number(me.amount || 0) > 0 && (
            <button
              type="button"
              onClick={() => onUndoBid(me.id)}
              disabled={!canParticipantBid(me.id)}
              className="self-start text-sm text-ink-3 hover:text-accent underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed bg-transparent border-0 p-0 cursor-pointer"
            >
              Undo my last bid
            </button>
          )}
        </div>
      )}

      {/* The room. Read-only, ranked, no bid controls. */}
      {others.length > 0 && (
        <div className="flex flex-col">
          <div className="flex items-baseline justify-between pb-2 border-b border-hairline">
            <span className="label">The room</span>
            <span className="label">Pledged</span>
          </div>
          {others.map((p) => {
            const rank = ranked.findIndex(r => r.id === p.id) + 1
            const isLeader = p.id === leaderId
            return (
              <div
                key={p.id}
                className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 py-3 border-b border-hairline"
              >
                <span className={`num text-sm ${isLeader ? 'text-accent' : 'text-ink-3'}`}>
                  {rank}
                </span>
                <span className={`text-[0.9rem] truncate ${isLeader ? 'text-ink font-medium' : 'text-ink'}`}>
                  {p.display_name}
                  {isLeader && <span className="pill pill-accent ml-2 align-middle">Leading</span>}
                </span>
                <span className={`num text-[0.9rem] ${isLeader ? 'text-accent' : 'text-ink'}`}>
                  ${Number(p.amount || 0).toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {participants.length === 0 && (
        <p className="text-sm text-ink-3 py-6 text-center m-0">
          Nobody has joined yet. Share the session link to get started.
        </p>
      )}
    </div>
  )
})

export default ParticipantsList
