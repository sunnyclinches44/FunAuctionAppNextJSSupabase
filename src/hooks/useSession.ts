import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

export interface Session {
  id: string
  code: string
  title: string
}

export interface Participant {
  id: string
  session_id: string
  user_id: string | null
  device_id: string | null
  display_name: string
  amount: number
  created_at: string
}

export interface SessionData {
  session: Session
  participants: Participant[]
  total_amount: number
  participant_count: number
}

export function useSession(sessionCode: string) {
  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rtReady, setRtReady] = useState(false)

  const loadSession = useCallback(async () => {
    if (!sessionCode) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const { data: sessionData, error: sessionError } = await supabase.rpc('get_session_details', {
        p_session_code: sessionCode
      })

      if (sessionError) {
        console.error('Error getting session details:', sessionError)
        setError(sessionError.message || 'Session not found or not accessible.')
        return
      }

      if (sessionData) {
        setSession({
          id: sessionData.session.id,
          code: sessionData.session.code,
          title: sessionData.session.title
        })
        setParticipants(sessionData.participants || [])
      }
    } catch (error) {
      console.error('Error loading session:', error)
      setError('Failed to load session. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [sessionCode])

  // Real-time subscription
  useEffect(() => {
    if (!session?.id) return

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${session.id}`
        },
        (payload) => {
          console.log('Participant change:', payload)
          if (payload.eventType === 'INSERT') {
            setParticipants(prev => [...prev, payload.new as Participant])
          } else if (payload.eventType === 'UPDATE') {
            setParticipants(prev => prev.map(p => p.id === payload.new.id ? payload.new as Participant : p))
          } else if (payload.eventType === 'DELETE') {
            setParticipants(prev => prev.filter(p => p.id !== payload.old.id))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bids',
          filter: `session_id=eq.${session.id}`
        },
        (payload) => {
          console.log('Bid change:', payload)
          if (payload.eventType === 'INSERT') {
            // Reload session data to get updated amounts
            loadSession()
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status)
        setRtReady(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.id, loadSession])

  // Initial load
  useEffect(() => {
    loadSession()
  }, [loadSession])

  const totalAmount = participants.reduce((sum, p) => sum + Number(p.amount || 0), 0)

  return {
    session,
    participants,
    isLoading,
    error,
    rtReady,
    totalAmount,
    reload: loadSession
  }
}
