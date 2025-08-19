import { useState, useCallback } from 'react'
import { useSessionStore } from '@/store/useSessionStore'

export interface BiddingState {
  isPlacingBid: string | null
  showCustomInput: string | null
  customAmount: string
}

export function useBidding(sessionCode: string, deviceId: string) {
  const [biddingState, setBiddingState] = useState<BiddingState>({
    isPlacingBid: null,
    showCustomInput: null,
    customAmount: ''
  })

  const { placeBid: storePlaceBid } = useSessionStore()

  const placeBid = useCallback(async (amount: number, participantId: string) => {
    if (!sessionCode || !deviceId) {
      console.error('Missing sessionCode or deviceId:', { sessionCode, deviceId })
      return false
    }

    console.log('Placing bid:', { amount, participantId, sessionCode, deviceId })
    setBiddingState(prev => ({ ...prev, isPlacingBid: participantId }))
    
    try {
      const success = await storePlaceBid(sessionCode, deviceId, amount)
      console.log('Bid result:', success)

      if (!success) {
        alert('Failed to place bid. Please try again.')
        return false
      }

      return true
    } catch (error) {
      console.error('Error placing bid:', error)
      alert('Failed to place bid. Please try again.')
      return false
    } finally {
      setBiddingState(prev => ({ ...prev, isPlacingBid: null }))
    }
  }, [sessionCode, deviceId, storePlaceBid])

  const placeCustomBid = useCallback(async (amount: number, participantId: string) => {
    if (!sessionCode || !deviceId) return false

    setBiddingState(prev => ({ ...prev, isPlacingBid: participantId }))
    
    try {
      const success = await storePlaceBid(sessionCode, deviceId, amount)

      if (!success) {
        alert('Failed to place bid. Please try again.')
        return false
      }

      // Clear custom input
      setBiddingState(prev => ({ 
        ...prev, 
        showCustomInput: null, 
        customAmount: '',
        isPlacingBid: null 
      }))
      
      return true
    } catch (error) {
      console.error('Error placing custom bid:', error)
      alert('Failed to place bid. Please try again.')
      return false
    } finally {
      setBiddingState(prev => ({ ...prev, isPlacingBid: null }))
    }
  }, [sessionCode, deviceId, storePlaceBid])

  const setCustomInput = useCallback((participantId: string | null, amount: string = '') => {
    setBiddingState(prev => ({ 
      ...prev, 
      showCustomInput: participantId, 
      customAmount: amount 
    }))
  }, [])

  const updateCustomAmount = useCallback((amount: string) => {
    setBiddingState(prev => ({ ...prev, customAmount: amount }))
  }, [])

  return {
    ...biddingState,
    placeBid,
    placeCustomBid,
    setCustomInput,
    updateCustomAmount
  }
}
