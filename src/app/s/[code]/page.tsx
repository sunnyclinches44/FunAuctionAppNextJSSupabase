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
import BidsHistory from '@/components/BidsHistory'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function SessionRoom() {
  const { code } = useParams<{ code: string }>()
  const [myDeviceId, setMyDeviceId] = useState<string>('')
  const [myName, setMyName] = useState<string>('')
  const [isSavingName, setIsSavingName] = useState(false)

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

        <section className="max-w-2xl mx-auto p-4 pb-28 space-y-4">
          {/* Participant Join Interface */}
          <ParticipantJoin
            myName={myName}
            onNameChange={setMyName}
            onSave={handleSaveName}
            isSaving={isSavingName}
            hasJoined={hasJoined}
            displayName={myRow?.display_name}
          />

          {/* Participants List */}
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

          {/* Bids History */}
          <BidsHistory sessionCode={code} />

          {/* Grand Total */}
          <div className="p-4 bg-slate-800/30 border border-slate-600 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-slate-300">Grand Total</span>
              <span className="text-2xl font-bold text-[var(--neon)]">
                ${totalAmount}
              </span>
            </div>
          </div>
        </section>
      </main>
    </ErrorBoundary>
  )
}