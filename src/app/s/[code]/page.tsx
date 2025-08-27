'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { getOrCreateDeviceId, getDisplayName, saveDisplayName } from '@/lib/utils'
import { useSessionStore, useCurrentSession, useParticipants, useTotalAmount, useIsLoading, useError, useRtReady } from '@/store/useSessionStore'
import { useRealTime } from '@/hooks/useRealTime'
import { useBidding } from '@/hooks/useBidding'
import ModernSessionLayout from '@/components/session/ModernSessionLayout'
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
    
    // Validate mobile number
    if (!myMobileNumber.trim()) {
      alert('Please enter your mobile number')
      return
    }

    // Enhanced mobile number validation
    const validateMobileNumber = (number: string): boolean => {
      const cleanNumber = number.replace(/[\s\-\(\)]/g, '')
      
      // Australian mobile number patterns
      const auPatterns = [
        /^\+614\d{8}$/,           // +61 4XX XXX XXX
        /^614\d{8}$/,             // 61 4XX XXX XXX (without +)
        /^04\d{8}$/,              // 04XX XXX XXX
        /^4\d{8}$/,               // 4XX XXX XXX (without 0)
      ]
      
      // International patterns (common formats)
      const internationalPatterns = [
        /^\+[1-9]\d{1,14}$/,     // +[country code][number] (E.164 format)
        /^00[1-9]\d{1,14}$/,     // 00[country code][number] (international format)
      ]
      
      return auPatterns.some(pattern => pattern.test(cleanNumber)) ||
             internationalPatterns.some(pattern => pattern.test(cleanNumber))
    }

    if (!validateMobileNumber(myMobileNumber.trim())) {
      alert('Please enter a valid mobile number (e.g., +61 4XX XXX XXX or 04XX XXX XXX)')
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
      <main className="min-h-screen">
        <Navigation />
        <div className="text-center py-8 pt-24">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-slate-400">Loading session...</p>
        </div>
        <ModernFooter />
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen">
        <Navigation />
        <div className="text-center py-8 pt-24">
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
          onPlaceBid={handlePlaceBid}
          onCustomBid={(participantId: string) => setCustomInput(participantId)}
          isPlacingBid={isPlacingBid}
          showCustomInput={showCustomInput}
          customAmount={customAmount}
          onCustomAmountChange={updateCustomAmount}
          onCustomAmountSubmit={handleCustomBidSubmit}
          onCustomAmountCancel={() => setCustomInput(null)}
          totalAmount={totalAmount}
          sessionCode={code}
          achievementToast={achievementToast}
          onCloseToast={() => setAchievementToast(null)}
        />
      </ErrorBoundary>
      <ModernFooter />
    </main>
  )
}