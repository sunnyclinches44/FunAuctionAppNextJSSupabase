'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Interface for the data returned by Supabase query
interface BidWithParticipant {
  id: number
  delta: number
  created_at: string
  participants: {
    display_name: string
  }[]
}

interface BidsHistoryProps {
  sessionCode: string
  isVisible?: boolean // Only load when visible
  maxBids?: number // Limit number of bids to show
}

export default function BidsHistory({ 
  sessionCode, 
  isVisible = false, 
  maxBids = 3 
}: BidsHistoryProps) {
  const [bids, setBids] = useState<BidWithParticipant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null)

  // Only load bids when component is visible and we haven't loaded recently
  const shouldLoadBids = () => {
    if (!isVisible) return false
    if (!lastLoaded) return true
    
    // Only reload if it's been more than 30 seconds
    const timeSinceLastLoad = Date.now() - lastLoaded.getTime()
    return timeSinceLastLoad > 30000
  }

  const loadBids = useCallback(async () => {
    if (!shouldLoadBids()) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          id,
          delta,
          created_at,
          participants!inner(display_name)
        `)
        .eq('session_id', (
          await supabase
            .from('sessions')
            .select('id')
            .eq('code', sessionCode)
            .single()
        ).data?.id)
        .order('created_at', { ascending: false })
        .limit(maxBids)

      if (error) throw error
      
      setBids(data || [])
      setLastLoaded(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bid history')
    } finally {
      setIsLoading(false)
    }
  }, [sessionCode, maxBids])

  // Load bids when component becomes visible
  useEffect(() => {
    if (isVisible) {
      loadBids()
    }
  }, [isVisible, loadBids])

  // Don't render anything if not visible
  if (!isVisible) {
    return null
  }

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-slate-400 mt-2">Loading bid history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button 
          onClick={loadBids}
          className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
        >
          Try again
        </button>
      </div>
    )
  }

  if (bids.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-slate-400 text-sm">No bids yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-slate-300 mb-3">Recent Bids</h4>
      {bids.map((bid) => (
        <div key={bid.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
              <span className="text-blue-400 text-sm">💰</span>
            </div>
            <div>
              <p className="text-slate-200 text-sm font-medium">
                {bid.participants[0]?.display_name || 'Unknown'}
              </p>
              <p className="text-slate-400 text-xs">
                {new Date(bid.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-green-400 font-semibold">+${bid.delta}</p>
          </div>
        </div>
      ))}
      
      {/* Refresh button for manual refresh */}
      <button 
        onClick={loadBids}
        className="w-full mt-3 py-2 px-3 bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 text-sm rounded-lg transition-colors"
        disabled={isLoading}
      >
        {isLoading ? 'Refreshing...' : 'Refresh History'}
      </button>
    </div>
  )
}