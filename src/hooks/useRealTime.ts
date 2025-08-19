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
        (payload) => {
          console.log('Participant change:', payload)
          
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
        (payload) => {
          console.log('New bid:', payload)
          addBid(payload.new as Bid)
          
          // Reload session to get updated amounts - use session code, not session ID
          if (currentSession?.code) {
            useSessionStore.getState().loadSession(currentSession.code)
          }
        }
      )
      
      // Subscribe and handle status changes
      .subscribe((status) => {
        console.log('Realtime status:', status)
        setRtReady(status === 'SUBSCRIBED')
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
