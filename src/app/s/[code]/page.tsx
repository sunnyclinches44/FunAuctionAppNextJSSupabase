'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { getOrCreateDeviceId, getDisplayName, saveDisplayName } from '@/lib/utils'
import { useSessionStore, useCurrentSession, useParticipants, useTotalAmount, useIsLoading, useError, useRtReady } from '@/store/useSessionStore'
import { useRealTime } from '@/hooks/useRealTime'
import { useBidding } from '@/hooks/useBidding'
import SessionHeader from '@/components/session/SessionHeader'
import ParticipantJoin from '@/components/session/ParticipantJoin'
import ParticipantsList from '@/components/session/ParticipantsList'
import Leaderboard from '@/components/session/Leaderboard'
import BidsHistory from '@/components/BidsHistory'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorBoundary from '@/components/ErrorBoundary'
import AchievementToast from '@/components/ui/AchievementToast'

export default function SessionRoom() {
  const { code } = useParams<{ code: string }>()
  const [myDeviceId, setMyDeviceId] = useState<string>('')
  const [myName, setMyName] = useState<string>('')
  const [isSavingName, setIsSavingName] = useState(false)
  const [achievementToast, setAchievementToast] = useState<{
    message: string
    type: 'success' | 'achievement' | 'info'
  } | null>(null)

  // Enhanced store hooks
  const { loadSession, joinSession, placeBid: storePlaceBid } = useSessionStore()
  const session = useCurrentSession()
  const participants = useParticipants()
  const isLoading = useIsLoading()
  const error = useError()
  const rtReady = useRtReady()
  const totalAmount = useTotalAmount()

  // Bidding hook - only initialize when we have both code and deviceId
  const { 
    isPlacingBid, 
    showCustomInput, 
    customAmount, 
    placeBid, 
    placeCustomBid, 
    setCustomInput, 
    updateCustomAmount 
  } = useBidding(code && myDeviceId ? code : '', myDeviceId || '')

  // Real-time updates
  useRealTime(session?.id || null)

  // Initialize device ID and display name
  useEffect(() => {
    const id = getOrCreateDeviceId()
    setMyDeviceId(id)
    const saved = getDisplayName()
    setMyName(saved)
  }, [])

  // Load session on mount
  useEffect(() => {
    if (code && typeof code === 'string') {
      console.log('Loading session with code:', code)
      loadSession(code)
    }
  }, [code, loadSession])

  // Handle name saving
  const handleSaveName = async () => {
    if (!myName.trim() || !code) return

    setIsSavingName(true)
    try {
      const success = await joinSession(code, myName.trim(), myDeviceId)

      if (success) {
        // Save to localStorage
        saveDisplayName(myName.trim())
        
        // Reload session data
        await loadSession(code)
      }
      
    } catch (error) {
      console.error('Error joining session:', error)
      alert('Failed to join session. Please try again.')
    } finally {
      setIsSavingName(false)
    }
  }

  // Handle preset bid placement
  const handlePlaceBid = async (amount: number, participantId: string): Promise<boolean> => {
    if (!hasJoined) {
      alert('Please join the session first before placing bids.')
      return false
    }
    
    const success = await placeBid(amount, participantId)
    if (success) {
      await loadSession(code)
    }
    return success
  }

  // Handle custom bid placement
  const handleCustomBidSubmit = async (participantId: string) => {
    if (!hasJoined) {
      alert('Please join the session first before placing bids.')
      return
    }
    
    if (!customAmount) return
    
    const amount = Number(customAmount)
    if (amount < 5 || amount > 10000) {
      alert('Please enter an amount between $5 and $10,000')
      return
    }

    const success = await placeCustomBid(amount, participantId)
    if (success) {
      await loadSession(code)
    }
  }

  // Check if current user has joined
  const myRow = participants.find((p) => p.device_id === myDeviceId)
  const hasJoined = !!myRow

  // Detect when someone becomes the highest bidder
  useEffect(() => {
    if (participants.length > 0) {
      const highestBidder = participants.reduce((highest, current) => 
        Number(current.amount || 0) > Number(highest.amount || 0) ? current : highest
      , participants[0])

      // Check if this is a new highest bidder (you can add more sophisticated logic here)
      if (highestBidder && highestBidder.amount > 0) {
        const isMyAchievement = highestBidder.device_id === myDeviceId
        
        if (isMyAchievement) {
          setAchievementToast({
            message: `🎉 Congratulations! You're now the highest bidder with $${highestBidder.amount}!`,
            type: 'achievement'
          })
        } else {
          setAchievementToast({
            message: `🏆 ${highestBidder.display_name} is now leading with $${highestBidder.amount}!`,
            type: 'info'
          })
        }
      }
    }
  }, [participants, myDeviceId])

  if (isLoading) {
    return (
      <main className="relative z-10">
        <div className="text-center py-8">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-slate-400">Loading session...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="relative z-10">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Session</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={() => loadSession(code)}
            className="btn bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </main>
    )
  }

  return (
    <ErrorBoundary>
      <main className="relative z-10">
        <SessionHeader title={session?.title} rtReady={rtReady} />

        {/* Achievement Toast */}
        {achievementToast && (
          <AchievementToast
            message={achievementToast.message}
            type={achievementToast.type}
            onClose={() => setAchievementToast(null)}
            duration={5000}
          />
        )}

        {/* Floating Action Button for Mobile */}
        <div className="fixed bottom-6 right-6 lg:hidden z-40">
          <div className="flex flex-col gap-3">
            {/* Quick Participants List Access - Now the primary action */}
            <button
              onClick={() => {
                const participantsList = document.querySelector('.mobile-participants-list')
                if (participantsList) {
                  participantsList.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }}
              className="btn btn-primary w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl"
              title="View Participants & Bid"
            >
              👥
            </button>
            
            {/* Quick Leaderboard Access */}
            <button
              onClick={() => {
                const leaderboard = document.querySelector('.mobile-leaderboard')
                if (leaderboard) {
                  leaderboard.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }}
              className="btn bg-slate-600 hover:bg-slate-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-xl font-bold"
              title="View Leaderboard"
            >
              🏆
            </button>
            
            {/* Quick Total Access */}
            <button
              onClick={() => {
                const total = document.querySelector('.mobile-total')
                if (total) {
                  total.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }}
              className="btn bg-slate-600 hover:bg-slate-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-xl font-bold"
              title="View Total"
            >
              $
            </button>
          </div>
        </div>

        <section className="max-w-7xl mx-auto p-4 pb-28">
          {/* Mobile Layout: Single Column Stack */}
          <div className="block lg:hidden space-y-4">
            {/* Participant Join Interface */}
            <ParticipantJoin
              myName={myName}
              onNameChange={setMyName}
              onSave={handleSaveName}
              isSaving={isSavingName}
              hasJoined={hasJoined}
              displayName={myRow?.display_name}
            />

            {/* Participants List - Moved above Leaderboard for better mobile UX */}
            <div className="mobile-participants-list">
              <ParticipantsList
                participants={participants}
                currentDeviceId={myDeviceId}
                onPlaceBid={handlePlaceBid}
                onCustomBid={(participantId) => setCustomInput(participantId)}
                isPlacingBid={isPlacingBid}
                showCustomInput={showCustomInput}
                customAmount={customAmount}
                onCustomAmountChange={updateCustomAmount}
                onCustomAmountSubmit={handleCustomBidSubmit}
                onCustomAmountCancel={() => setCustomInput(null)}
              />
            </div>

            {/* Leaderboard - Moved below Participants List for mobile */}
            <div className="mobile-leaderboard">
              <Leaderboard participants={participants} />
            </div>

            {/* Bids History */}
            <BidsHistory sessionCode={code} />

            {/* Grand Total */}
            <div className="mobile-total p-4 bg-slate-800/30 border border-slate-600 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-slate-300">Grand Total</span>
                <span className="text-2xl font-bold text-[var(--neon)]">
                  ${totalAmount}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop/Tablet Layout: Multi-Column Grid */}
          <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6">
            {/* Left Column: Join + Leaderboard */}
            <div className="lg:col-span-3 space-y-4">
              {/* Sticky Join Section */}
              <div className="sticky top-4">
                <ParticipantJoin
                  myName={myName}
                  onNameChange={setMyName}
                  onSave={handleSaveName}
                  isSaving={isSavingName}
                  hasJoined={hasJoined}
                  displayName={myRow?.display_name}
                />
              </div>

              {/* Leaderboard */}
              <Leaderboard participants={participants} />
            </div>

            {/* Center Column: Participants List */}
            <div className="lg:col-span-6">
              <ParticipantsList
                participants={participants}
                currentDeviceId={myDeviceId}
                onPlaceBid={handlePlaceBid}
                onCustomBid={(participantId) => setCustomInput(participantId)}
                isPlacingBid={isPlacingBid}
                showCustomInput={showCustomInput}
                customAmount={customAmount}
                onCustomAmountChange={updateCustomAmount}
                onCustomAmountSubmit={handleCustomBidSubmit}
                onCustomAmountCancel={() => setCustomInput(null)}
              />
            </div>

            {/* Right Column: Bids History + Total */}
            <div className="lg:col-span-3 space-y-4">
              {/* Sticky Bids History */}
              <div className="sticky top-4">
                <BidsHistory sessionCode={code} />
              </div>

              {/* Grand Total */}
              <div className="p-4 bg-slate-800/30 border border-slate-600 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-slate-300">Grand Total</span>
                  <span className="text-2xl font-bold text-[var(--neon)]">
                    ${totalAmount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tablet Layout: 2-Column Grid */}
          <div className="hidden md:block lg:hidden">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column: Join + Leaderboard */}
              <div className="space-y-4">
                <ParticipantJoin
                  myName={myName}
                  onNameChange={setMyName}
                  onSave={handleSaveName}
                  isSaving={isSavingName}
                  hasJoined={hasJoined}
                  displayName={myRow?.display_name}
                />
                <Leaderboard participants={participants} />
              </div>

              {/* Right Column: Participants + Bids + Total */}
              <div className="space-y-4">
                <ParticipantsList
                  participants={participants}
                  currentDeviceId={myDeviceId}
                  onPlaceBid={handlePlaceBid}
                  onCustomBid={(participantId) => setCustomInput(participantId)}
                  isPlacingBid={isPlacingBid}
                  showCustomInput={showCustomInput}
                  customAmount={customAmount}
                  onCustomAmountChange={updateCustomAmount}
                  onCustomAmountSubmit={handleCustomBidSubmit}
                  onCustomAmountCancel={() => setCustomInput(null)}
                />
                <BidsHistory sessionCode={code} />
                <div className="p-4 bg-slate-800/30 border border-slate-600 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-slate-300">Grand Total</span>
                    <span className="text-2xl font-bold text-[var(--neon)]">
                      ${totalAmount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </ErrorBoundary>
  )
}