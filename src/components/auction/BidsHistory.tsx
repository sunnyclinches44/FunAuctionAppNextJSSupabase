'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  maxBids = 8
}: BidsHistoryProps) {
  const [bids, setBids] = useState<BidWithParticipant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A ref, not state: the throttle has to be readable inside the callback
  // without making the callback change identity and re-fire the effect.
  const lastLoadedRef = useRef<number>(0)

  const loadBids = useCallback(async (force = false) => {
    // Refresh at most every 30 seconds on its own, always when asked.
    if (!force && lastLoadedRef.current && Date.now() - lastLoadedRef.current < 30000) {
      return
    }

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
      lastLoadedRef.current = Date.now()
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
    return <p className="text-sm text-ink-3 m-0 py-2">Loading recent bids…</p>
  }

  if (error) {
    return (
      <div className="py-2 flex flex-col items-start gap-2">
        <p className="text-sm text-danger m-0">{error}</p>
        <button onClick={() => loadBids(true)} className="btn btn-ghost">
          Try again
        </button>
      </div>
    )
  }

  if (bids.length === 0) {
    return <p className="text-sm text-ink-3 m-0 py-2">No bids yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col">
        {bids.map((bid) => (
          <div
            key={bid.id}
            className="grid grid-cols-[1fr_auto] items-baseline gap-3 py-3 border-b border-hairline last:border-b-0"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[0.9rem] text-ink truncate">
                {bid.participants[0]?.display_name || 'Someone'}
              </span>
              <span className="num text-xs text-ink-3">
                {new Date(bid.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
            <span className="num text-[0.9rem] text-ink">
              +${Number(bid.delta).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => loadBids(true)}
        className="btn btn-ghost self-start"
        disabled={isLoading}
      >
        {isLoading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  )
}