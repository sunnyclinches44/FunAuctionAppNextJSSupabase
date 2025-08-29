import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSessionStore, Participant, Bid } from '@/store/useSessionStore'

export function useRealTime(sessionId: string | null) {
  const channelRef = useRef<any>(null)
  const { 
    addParticipant, 
    updateParticipant, 
    removeParticipant, 
    addBid, 
    setRtReady,
    currentSession
  } = useSessionStore()

  useEffect(() => {
    if (!sessionId) return

    // Create channel for this session
    const channel = supabase
      .channel(`session-${sessionId}`)
      
      // Listen for participant changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`
        },
        (payload: any) => {
          console.log('Participant change:', payload)
          
          try {
            switch (payload.eventType) {
              case 'INSERT':
                addParticipant(payload.new as Participant)
                break
              case 'UPDATE':
                updateParticipant(payload.new as Participant)
                break
              case 'DELETE':
                removeParticipant(payload.old.id)
                break
              default:
                console.warn('Unknown participant event type:', payload.eventType)
            }
          } catch (error) {
            console.error('Error handling participant change:', error)
          }
        }
      )
      
      // Listen for bid changes
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `session_id=eq.${sessionId}`
        },
        (payload: any) => {
          console.log('New bid:', payload)
          
          try {
            addBid(payload.new as Bid)
            // The store now handles updating participant amounts and total amount
            // No need to reload the entire session - this prevents continuous refresh
          } catch (error) {
            console.error('Error handling new bid:', error)
          }
        }
      )
      
      // Subscribe and handle status changes
      .subscribe((status) => {
        console.log('Realtime status:', status)
        setRtReady(status === 'SUBSCRIBED')
        
        // Handle connection issues
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Real-time connection issue, attempting to reconnect...')
          // The channel will automatically attempt to reconnect
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [sessionId, addParticipant, updateParticipant, removeParticipant, addBid, setRtReady, currentSession])

  return {
    isConnected: channelRef.current !== null
  }
}
