'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface Bid {
  id: string
  participant_name: string
  amount: number
  created_at: string
}

// Type for the raw data from Supabase join
interface RawBidData {
  id: string
  delta: number
  created_at: string
  participants: {
    display_name: string
  }[]
}

interface BidsHistoryProps {
  sessionCode: string
}

export default function BidsHistory({ sessionCode }: BidsHistoryProps) {
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Fetch initial bid history and get session_id
  useEffect(() => {
    loadBidHistory()
  }, [sessionCode])

  // Real-time subscription for new bids - FIXED: Use session_id instead of session_code
  useEffect(() => {
    if (!sessionId) return // Wait until we have the session_id

    const channel = supabase
      .channel(`bids-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `session_id=eq.${sessionId}` // FIXED: Use actual session_id
        },
        (payload) => {
          console.log('New bid received:', payload)
          // Reload the entire history since we need to join with participants
          loadBidHistory()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, sessionCode]) // Added sessionCode dependency

  async function loadBidHistory() {
    try {
      setLoading(true)
      
      // First, get the session_id from the session_code
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('code', sessionCode)
        .eq('is_active', true)
        .single()

      if (sessionError || !sessionData) {
        console.error('Error loading session:', sessionError)
        return
      }

      const currentSessionId = sessionData.id
      setSessionId(currentSessionId) // Store session_id for subscription

      // Now get the bids with participant names
      const { data, error } = await supabase
        .from('bids')
        .select(`
          id,
          delta,
          created_at,
          participants!inner(display_name)
        `)
        .eq('session_id', currentSessionId)
        .order('created_at', { ascending: false })
        .limit(3)

      if (error) {
        console.error('Error loading bid history:', error)
        return
      }

      // Transform data to match our interface
      const transformedBids: Bid[] = (data as RawBidData[]).map(bid => ({
        id: bid.id,
        participant_name: bid.participants[0].display_name, // Assuming only one participant for simplicity
        amount: bid.delta,
        created_at: bid.created_at
      }))

      setBids(transformedBids)
    } catch (error) {
      console.error('Error loading bid history:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatTimeAgo(dateString: string): string {
    const now = new Date()
    const bidTime = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - bidTime.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour ago`
    return `${Math.floor(diffInSeconds / 86400)} day ago`
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-6 p-4 bg-slate-800/30 border border-slate-600 rounded-xl">
        <div className="text-sm text-slate-400 text-center">Loading bid history...</div>
      </div>
    )
  }

  if (bids.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-6 p-4 bg-slate-800/30 border border-slate-600 rounded-xl">
        <div className="text-sm text-slate-400 text-center">No bids yet. Be the first to bid!</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-6 p-4 bg-slate-800/30 border border-slate-600 rounded-xl backdrop-blur-sm">
      <h3 className="text-sm font-medium text-slate-300 mb-3 text-center">Recent Bids</h3>
      <div className="space-y-2">
        {bids.map((bid, index) => (
          <div 
            key={bid.id}
            className={`flex items-center justify-between p-2 rounded-lg transition-all duration-200 ${
              index === 0 
                ? 'bg-blue-500/20 border border-blue-400/30' 
                : 'bg-slate-700/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-300">
                {bid.participant_name}
              </span>
              <span className="text-slate-500">→</span>
              <span className="text-sm font-medium text-white">
                +${bid.amount}
              </span>
            </div>
            <span className={`text-xs ${
              index === 0 ? 'text-blue-300' : 'text-slate-400'
            }`}>
              {formatTimeAgo(bid.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}