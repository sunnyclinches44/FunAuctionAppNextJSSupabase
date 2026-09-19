'use client'

import { useState } from 'react'
import ParticipantJoin from './ParticipantJoin'
import ParticipantsList from './ParticipantsList'
import Leaderboard from './Leaderboard'
import RoundRail from './RoundRail'
import BidsHistory from '@/components/auction/BidsHistory'
import QuizCard from '@/components/quiz/QuizCard'
import type { QuizPhase, QuizState } from '@/lib/quiz'

interface ModernSessionLayoutProps {
  session: any
  rtReady: boolean
  participants: any[]
  myDeviceId: string
  myName: string
  onNameChange: (name: string) => void
  mobileNumber: string
  onMobileNumberChange: (mobileNumber: string) => void
  onSave: () => Promise<void>
  isSaving: boolean
  hasJoined: boolean
  displayName?: string
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
  totalAmount: number
  sessionCode: string
  quizState: QuizState
  quizPhase: QuizPhase
  onOpenQuiz: () => void
}

export default function ModernSessionLayout({
  session,
  rtReady,
  participants,
  myDeviceId,
  myName,
  onNameChange,
  mobileNumber,
  onMobileNumberChange,
  onSave,
  isSaving,
  hasJoined,
  displayName,
  currentRound,
  onPlaceBid,
  onCustomBid,
  onUndoBid,
  isPlacingBid,
  showCustomInput,
  customAmount,
  onCustomAmountChange,
  onCustomAmountSubmit,
  onCustomAmountCancel,
  totalAmount,
  sessionCode,
  quizState,
  quizPhase,
  onOpenQuiz
}: ModernSessionLayoutProps) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'history'>('leaderboard')

  const bidding = (
    <ParticipantsList
      participants={participants}
      currentDeviceId={myDeviceId}
      currentRound={currentRound}
      onPlaceBid={onPlaceBid}
      onCustomBid={onCustomBid}
      onUndoBid={onUndoBid}
      isPlacingBid={isPlacingBid}
      showCustomInput={showCustomInput}
      customAmount={customAmount}
      onCustomAmountChange={onCustomAmountChange}
      onCustomAmountSubmit={onCustomAmountSubmit}
      onCustomAmountCancel={onCustomAmountCancel}
    />
  )

  const grandTotal = (
    <div className="card p-5">
      <div className="flex items-end justify-between gap-3 pt-3 border-t-2 border-ink">
        <div className="flex flex-col gap-1">
          <span className="label">Raised so far</span>
          <span className="display text-4xl num leading-none">
            ${Number(totalAmount || 0).toLocaleString()}
          </span>
        </div>
        <div className="text-sm text-ink-3 text-right leading-snug">
          {participants.length} {participants.length === 1 ? 'bidder' : 'bidders'}
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
      {/* Session header */}
      <header className="flex flex-wrap items-end justify-between gap-4 pb-6 mb-8 border-b border-hairline">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="label">Auction session</span>
          <h1 className="text-2xl sm:text-3xl truncate">{session?.title || 'Fun Auction'}</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="num text-sm text-ink-3 border border-hairline rounded px-2 py-1">
            {sessionCode}
          </span>
          <span className={`pill ${rtReady ? 'pill-live' : 'pill-idle'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
            {rtReady ? 'Live' : 'Connecting'}
          </span>
        </div>
      </header>

      {/* Join */}
      {!hasJoined && (
        <div className="mb-8 animate-rise">
          <div className="card p-6 max-w-lg mx-auto flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl">Join the auction</h2>
              <p className="text-sm text-ink-3 m-0">
                Your name appears to the room. Your number is only visible to the organiser.
              </p>
            </div>
            <ParticipantJoin
              myName={myName}
              onNameChange={onNameChange}
              mobileNumber={mobileNumber}
              onMobileNumberChange={onMobileNumberChange}
              onSave={onSave}
              isSaving={isSaving}
              hasJoined={hasJoined}
              displayName={displayName}
            />
          </div>
        </div>
      )}

      {/* One layout, two columns from lg up. */}
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="card p-5">
            <RoundRail currentRound={currentRound} />
          </div>
          {bidding}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="lg:sticky lg:top-24 flex flex-col gap-6">
            {grandTotal}

            <QuizCard state={quizState} phase={quizPhase} onOpen={onOpenQuiz} />

            <div className="card p-5 flex flex-col gap-4">
              <div className="flex gap-1 border-b border-hairline -mx-5 px-5 pb-0">
                {(['leaderboard', 'history'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    aria-pressed={activeTab === tab}
                    className={`px-3 py-2 text-sm capitalize border-b-2 -mb-px transition-colors duration-200 ${
                      activeTab === tab
                        ? 'border-accent text-ink font-medium'
                        : 'border-transparent text-ink-3 hover:text-ink'
                    }`}
                  >
                    {tab === 'leaderboard' ? 'Leaderboard' : 'Recent bids'}
                  </button>
                ))}
              </div>

              {activeTab === 'leaderboard' ? (
                <Leaderboard participants={participants} />
              ) : (
                <BidsHistory sessionCode={sessionCode} isVisible />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
