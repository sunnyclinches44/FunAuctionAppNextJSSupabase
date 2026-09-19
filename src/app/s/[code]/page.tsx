'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { getOrCreateDeviceId, getDisplayName, saveDisplayName } from '@/lib/utils'
import { AUCTION_CONFIG } from '@/lib/constants'
import { useSessionStore, useCurrentSession, useParticipants, useTotalAmount, useIsLoading, useError, useRtReady, useCurrentRound, useQuizPhase, useActiveQuestionId } from '@/store/useSessionStore'
import { useRealTime } from '@/hooks/useRealTime'
import { useBidding } from '@/hooks/useBidding'
import { useQuiz } from '@/hooks/useQuiz'
import QuizModal from '@/components/quiz/QuizModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ModernSessionLayout from '@/components/session/ModernSessionLayout'
import { validateMobileNumber } from '@/components/session/ParticipantJoin'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorBoundary from '@/components/layout/ErrorBoundary'
import Navigation from '@/components/layout/Navigation'
import ModernFooter from '@/components/layout/ModernFooter'

export default function SessionRoom() {
  const { code } = useParams<{ code: string }>()
  const [myDeviceId, setMyDeviceId] = useState<string>('')
  const [myName, setMyName] = useState<string>('')
  const [myMobileNumber, setMyMobileNumber] = useState<string>('')
  const [isSavingName, setIsSavingName] = useState(false)
  // The undo flow, asked and answered in one dialog drawn by the app.
  const [undoFor, setUndoFor] = useState<string | null>(null)
  const [isUndoing, setIsUndoing] = useState(false)
  const [undoError, setUndoError] = useState<string | null>(null)


  // Enhanced store hooks
  const { loadSession, joinSession, placeBid: storePlaceBid } = useSessionStore()
  const session = useCurrentSession()
  const participants = useParticipants()
  const isLoading = useIsLoading()
  const error = useError()
  const rtReady = useRtReady()
  const totalAmount = useTotalAmount()
  const currentRound = useCurrentRound()
  const quizPhase = useQuizPhase()
  const activeQuestionId = useActiveQuestionId()

  // Bidding hook - only initialize when we have both code and deviceId
  const { 
    isPlacingBid, 
    showCustomInput, 
    customAmount, 
    placeBid, 
    placeCustomBid, 
    setCustomInput, 
    updateCustomAmount,
    undoBid
  } = useBidding(code && myDeviceId ? code : '', myDeviceId || '')

  // Real-time updates
  useRealTime(session?.id || null)

  // Check if current user has joined
  const myRow = participants.find((p) => p.device_id === myDeviceId)
  const hasJoined = !!myRow

  // The live quiz. Its pointer arrives over the same sessions subscription.
  const quiz = useQuiz({
    sessionCode: code && session ? code : '',
    deviceId: myDeviceId,
    phase: quizPhase,
    activeQuestionId,
    hasJoined
  })

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
    
    // Validate mobile number. The form already blocks this, so reaching it
    // means something was pasted in or the button was driven directly.
    if (!validateMobileNumber(myMobileNumber.trim())) {
      alert('Enter a valid mobile number, for example 04XX XXX XXX or +61 4XX XXX XXX')
      return
    }

    setIsSavingName(true)
    try {
      const success = await joinSession(code, myName.trim(), myDeviceId, myMobileNumber.trim())

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
    // No need to reload session - real-time updates will handle the UI updates
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
    if (amount < AUCTION_CONFIG.MIN_BID_AMOUNT || amount > AUCTION_CONFIG.MAX_BID_AMOUNT) {
      alert(`Enter an amount between $${AUCTION_CONFIG.MIN_BID_AMOUNT} and $${AUCTION_CONFIG.MAX_BID_AMOUNT.toLocaleString()}`)
      return
    }

    await placeCustomBid(amount, participantId)
    // No need to reload session - real-time updates will handle the UI updates
  }

  // Handle undo bid. The button only asks; the dialog does the undoing, so
  // the person sees exactly one pop-up either way.
  const handleUndoBid = async (participantId: string) => {
    if (!hasJoined) return false
    setUndoError(null)
    setUndoFor(participantId)
    return false
  }

  const confirmUndo = async () => {
    if (!undoFor) return
    setIsUndoing(true)
    setUndoError(null)
    try {
      const success = await undoBid(undoFor)
      if (success) {
        // The totals come back over realtime; nothing more to say.
        setUndoFor(null)
      } else {
        setUndoError('That did not go through. Try once more.')
      }
    } finally {
      setIsUndoing(false)
    }
  }

  // Removed highest bidder detection and achievement toasts

  if (isLoading) {
    return (
      <main className="min-h-screen">
        <Navigation />
        <div className="text-center py-16 pt-32">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-ink-3">Loading the session…</p>
        </div>
        <ModernFooter />
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen">
        <Navigation />
        <div className="max-w-md mx-auto px-4 py-16 pt-32 text-center">
          <h2 className="text-xl mb-2">This session would not load</h2>
          <p className="text-ink-2 mb-6">{error}</p>
          <button onClick={() => loadSession(code)} className="btn btn-primary">
            Try again
          </button>
        </div>
        <ModernFooter />
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <Navigation />
      <ErrorBoundary>
        <ModernSessionLayout
          session={session}
          rtReady={rtReady}
          participants={participants}
          myDeviceId={myDeviceId}
          myName={myName}
          onNameChange={setMyName}
          mobileNumber={myMobileNumber}
          onMobileNumberChange={setMyMobileNumber}
          onSave={handleSaveName}
          isSaving={isSavingName}
          hasJoined={hasJoined}
          displayName={myRow?.display_name}
          currentRound={currentRound}
          onPlaceBid={handlePlaceBid}
          onCustomBid={(participantId: string) => setCustomInput(participantId)}
          onUndoBid={handleUndoBid}
          isPlacingBid={isPlacingBid}
          showCustomInput={showCustomInput}
          customAmount={customAmount}
          onCustomAmountChange={updateCustomAmount}
          onCustomAmountSubmit={handleCustomBidSubmit}
          onCustomAmountCancel={() => setCustomInput(null)}
          totalAmount={totalAmount}
          sessionCode={code}
          quizState={quiz.state}
          quizPhase={quiz.phase}
          onOpenQuiz={quiz.open}
        />
      </ErrorBoundary>
      {undoFor && (
        <ConfirmDialog
          title="Undo your last bid?"
          body="Your most recent pledge comes off your total. This cannot be reversed."
          confirmLabel="Undo it"
          cancelLabel="Keep it"
          error={undoError}
          isBusy={isUndoing}
          onConfirm={confirmUndo}
          onCancel={() => {
            setUndoFor(null)
            setUndoError(null)
          }}
        />
      )}
      {quiz.isOpen && (
        <QuizModal
          state={quiz.state}
          phase={quiz.phase}
          synced={quiz.synced}
          hasJoined={hasJoined}
          isSubmitting={quiz.isSubmitting}
          error={quiz.error}
          onAnswer={quiz.submitAnswer}
          onDismiss={quiz.dismiss}
        />
      )}
      <ModernFooter />
    </main>
  )
}