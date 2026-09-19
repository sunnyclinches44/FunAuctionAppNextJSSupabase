'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ModernAdminLayout from '@/components/admin/ModernAdminLayout'
import Navigation from '@/components/layout/Navigation'
import ModernFooter from '@/components/layout/ModernFooter'

interface Session {
  id: string
  code: string
  title: string
  created_at: string
  participant_count: number
  total_amount: number
  current_round: number
  quiz_phase?: string
}

interface Participant {
  id: string
  display_name: string
  mobile_number: string
  amount: number
  device_id: string
  created_at: string
}

function SignInCard({ onDone }: { onDone?: () => void }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const redirectTo =
      typeof window !== 'undefined' ? window.location.origin + '/admin' : undefined
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    setBusy(false)
    if (error) return alert(error.message)
    setSent(true)
    onDone?.()
    alert('Magic link sent. Check your inbox.')
  }

  return (
    <div className="card p-6 max-w-md w-full mx-auto flex flex-col gap-4 text-left">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl">Sign in</h2>
        <p className="text-sm text-ink-3 m-0">
          We send a link to your inbox. No password to remember.
        </p>
      </div>
      {sent ? (
        <p className="text-sm text-live m-0">
          Link sent. Open it on this device and you will land back here.
        </p>
      ) : (
        <form onSubmit={send} className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="admin-email" className="sr-only">Email address</label>
          <input
            id="admin-email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field sm:flex-1"
            autoComplete="email"
          />
          <button className="btn btn-primary shrink-0" disabled={busy}>
            {busy ? 'Sending…' : 'Send link'}
          </button>
        </form>
      )}
    </div>
  )
}



export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [ready, setReady] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)

  // watch auth state
  useEffect(() => {
    let live = true
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return
      setAuthed(!!data.session)
      setEmail(data.session?.user?.email ?? null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setAuthed(!!sess)
      setEmail(sess?.user?.email ?? null)
    })
    return () => {
      live = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Load sessions when authenticated
  useEffect(() => {
    if (authed) {
      loadSessions()
    }
  }, [authed])

  async function loadSessions() {
    setLoading(true)
    try {
      // Get all active sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, code, title, created_at, is_active, current_round, quiz_phase')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (sessionsError) throw sessionsError

      if (!sessionsData || sessionsData.length === 0) {
        setSessions([])
        return
      }

      // Get all participants for all sessions in a single query
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('session_id, amount')
        .in('session_id', sessionsData.map(s => s.id))

      if (participantsError) throw participantsError

      // Process data in memory instead of multiple DB calls
      const sessionsWithDetails = sessionsData.map(session => {
        const sessionParticipants = participantsData?.filter(p => p.session_id === session.id) || []
        const participant_count = sessionParticipants.length
        const total_amount = sessionParticipants.reduce((sum, p) => sum + Number(p.amount || 0), 0)

        return {
          ...session,
          current_round: session.current_round ?? 1,
          participant_count,
          total_amount
        }
      })

      setSessions(sessionsWithDetails)
    } catch (error) {
      console.error('Error loading sessions:', error)
      alert('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  async function loadParticipants(sessionId: string): Promise<Participant[]> {
    try {
      const { data: participants, error } = await supabase
        .from('participants')
        .select('id, display_name, mobile_number, amount, device_id, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return participants || []
    } catch (error) {
      console.error('Error loading participants:', error)
      alert('Failed to load participants')
      return []
    }
  }

  async function refreshParticipants(sessionId: string) {
    try {
      const updatedParticipants = await loadParticipants(sessionId)
      console.log('Participants refreshed for session:', sessionId)
      return updatedParticipants
    } catch (error) {
      console.error('Error refreshing participants:', error)
      return []
    }
  }

  async function deleteParticipant(participantId: string, sessionId: string) {
    try {
      console.log('Attempting to delete participant:', participantId)
      console.log('Session ID:', sessionId)
      
      // First, let's verify the participant exists
      const { data: participantData, error: checkError } = await supabase
        .from('participants')
        .select('id, display_name, amount')
        .eq('id', participantId)
        .single()

      if (checkError) {
        console.error('Error checking participant:', checkError)
        throw new Error('Participant not found')
      }

      console.log('Participant found:', participantData)

      // Delete the participant (this will cascade delete their bids)
      const { error: deleteError } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId)

      if (deleteError) {
        console.error('Error deleting participant:', deleteError)
        throw deleteError
      }

      console.log('Participant deleted successfully from database')
      alert('Participant deleted successfully')
      
      // Reload sessions to update participant counts
      await loadSessions()
      
    } catch (error) {
      console.error('Error deleting participant:', error)
      alert(`Failed to delete participant: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async function deleteSession(sessionId: string) {
    try {
      console.log('Attempting to delete session:', sessionId)
      
      // First, let's check if the session exists and get its details
      const { data: sessionData, error: checkError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (checkError) {
        console.error('Error checking session:', checkError)
        throw new Error('Session not found')
      }

      console.log('Session found:', sessionData)

      // Check if there are participants that might prevent deletion
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('id, display_name, amount')
        .eq('session_id', sessionId)

      if (participantsError) {
        console.error('Error checking participants:', participantsError)
      } else {
        console.log('Participants found:', participants?.length || 0)
        if (participants && participants.length > 0) {
          console.log('Participant details:', participants)
        }
      }

      // Delete the session (this will cascade delete participants and bids due to foreign key constraints)
      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (deleteError) {
        console.error('Error deleting session:', deleteError)
        throw deleteError
      }

      console.log('Session deleted successfully from database')

      // Remove from local state
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      
      // Reload sessions to ensure consistency
      await loadSessions()
      
      alert('Session deleted successfully')
    } catch (error) {
      console.error('Error deleting session:', error)
      alert(`Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async function changeRound(sessionCode: string, round: number): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('set_session_round', {
        p_session_code: sessionCode,
        p_round: round
      })

      if (error) throw error

      // Reflect it immediately; every joined phone gets the same change over
      // realtime from the sessions table.
      setSessions(prev => prev.map(s =>
        s.code === sessionCode ? { ...s, current_round: data?.current_round ?? round } : s
      ))
      return true
    } catch (error) {
      console.error('Error changing round:', error)
      alert(`Could not change the round: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setAuthed(false)
    setEmail(null)
    setSessions([])
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Navigation />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {!ready ? (
          <p className="text-center text-ink-3 py-16">Checking your sign-in…</p>
        ) : !authed ? (
          <div className="max-w-xl mx-auto py-12 text-center flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="label">Admin</span>
              <h1 className="text-3xl sm:text-4xl">Run an auction</h1>
              <p className="text-ink-2 m-0">
                Sign in to create sessions, open each round, and see who has pledged what.
              </p>
            </div>

            {showLogin ? (
              <div className="animate-rise">
                <SignInCard onDone={() => setShowLogin(false)} />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button className="btn btn-primary" onClick={() => setShowLogin(true)}>
                  Sign in
                </button>
                <button onClick={() => router.push('/')} className="btn btn-ghost">
                  Back to home
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="animate-rise flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-3 m-0">
                Signed in as <span className="text-ink">{email}</span>
              </p>
              <button className="btn btn-quiet" onClick={signOut}>
                Sign out
              </button>
            </div>

            {loading ? (
              <p className="text-center text-ink-3 py-16">Loading your sessions…</p>
            ) : (
              <ModernAdminLayout
                sessions={sessions}
                onDelete={deleteSession}
                onDeleteParticipant={deleteParticipant}
                onLoadParticipants={loadParticipants}
                onCreateSession={() => router.push('/create')}
                onChangeRound={changeRound}
              />
            )}
          </div>
        )}
      </div>

      <ModernFooter />
    </main>
  )
}
