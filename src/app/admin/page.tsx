'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

interface Session {
  id: string
  code: string
  title: string
  created_at: string
  participant_count: number
  total_amount: number
}

interface Participant {
  id: string
  display_name: string
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
    <div className="card p-4 max-w-md w-full">
      <h3 className="text-lg font-semibold mb-2">Admin login</h3>
      {sent ? (
        <div className="text-amber-300 text-sm">
          Magic link sent. After you click it, you&apos;ll return here.
        </div>
      ) : (
        <form onSubmit={send} className="flex gap-2">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 outline-none"
          />
          <button className="btn btn-primary px-4 py-2" disabled={busy}>
            {busy ? 'Sending…' : 'Send link'}
          </button>
        </form>
      )}
    </div>
  )
}

function SessionsList({ sessions, onDelete, onDeleteParticipant, onLoadParticipants }: { 
  sessions: Session[], 
  onDelete: (sessionId: string) => void,
  onDeleteParticipant: (participantId: string, sessionId: string) => void,
  onLoadParticipants: (sessionId: string) => Promise<Participant[]>
}) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({})
  const [loadingParticipants, setLoadingParticipants] = useState<Set<string>>(new Set())

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This will permanently remove all session data, participants, and bids.')) {
      return
    }

    setDeleting(sessionId)
    try {
      onDelete(sessionId)
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteParticipant = async (participantId: string, sessionId: string, participantName: string) => {
            if (!confirm(`Are you sure you want to delete participant "${participantName}"? This will remove all their bids.`)) {
      return
    }

    try {
      await onDeleteParticipant(participantId, sessionId)
      // Remove participant from local state
      setParticipants(prev => ({
        ...prev,
        [sessionId]: prev[sessionId]?.filter(p => p.id !== participantId) || []
      }))
      
      // Also refresh the participants list to ensure consistency
      const updatedParticipants = await onLoadParticipants(sessionId)
      setParticipants(prev => ({ ...prev, [sessionId]: updatedParticipants }))
      
    } catch (error) {
      console.error('Error deleting participant:', error)
    }
  }

  const toggleSessionExpansion = async (sessionId: string) => {
    const newExpanded = new Set(expandedSessions)
    
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
      // Load participants if not already loaded
      if (!participants[sessionId]) {
        setLoadingParticipants(prev => new Set(prev).add(sessionId))
        try {
          const sessionParticipants = await onLoadParticipants(sessionId)
          setParticipants(prev => ({ ...prev, [sessionId]: sessionParticipants }))
        } finally {
          setLoadingParticipants(prev => {
            const newSet = new Set(prev)
            newSet.delete(sessionId)
            return newSet
          })
        }
      }
    }
    
    setExpandedSessions(newExpanded)
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center text-slate-400 py-8">
        No active sessions found.
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl">
      <h3 className="text-xl font-semibold mb-4">Active Sessions</h3>
      <div className="grid gap-4">
        {sessions.map((session) => {
          const isExpanded = expandedSessions.has(session.id)
          const sessionParticipants = participants[session.id] || []
          const isLoadingParticipants = loadingParticipants.has(session.id)
          
          return (
            <div key={session.id} className="card p-4 border border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-medium">{session.title || 'Untitled Session'}</h4>
                    <span className="text-sm bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                      {session.code}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 space-y-1">
                    <div>Created: {new Date(session.created_at).toLocaleDateString()}</div>
                    <div>Participants: {session.participant_count}</div>
                    <div>Total Amount: ₹{session.total_amount}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleSessionExpansion(session.id)}
                    className="btn btn-ghost btn-sm"
                  >
                    {isExpanded ? 'Hide Details' : 'View Details'}
                  </button>
                  <button
                    onClick={() => window.open(`/s/${session.code}`, '_blank')}
                    className="btn btn-ghost btn-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    disabled={deleting === session.id}
                    className="btn btn-error btn-sm"
                  >
                    {deleting === session.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              {/* Expanded participant details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <h5 className="text-md font-semibold mb-3 text-slate-300">Participants</h5>
                  
                  {isLoadingParticipants ? (
                    <div className="text-center py-4 text-slate-400">Loading participants...</div>
                  ) : sessionParticipants.length === 0 ? (
                    <div className="text-center py-4 text-slate-400">No participants yet</div>
                  ) : (
                    <div className="space-y-2">
                      {sessionParticipants.map((participant) => (
                        <div key={participant.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-slate-200">{participant.display_name}</div>
                            <div className="text-sm text-slate-400">
                              Amount: ₹{participant.amount} • Joined: {new Date(participant.created_at).toLocaleString()}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteParticipant(participant.id, session.id, participant.display_name)}
                            className="btn btn-error btn-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
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
        .select('id, code, title, created_at, is_active')
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
        .select('id, display_name, amount, device_id, created_at')
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

  async function signOut() {
    await supabase.auth.signOut()
    setAuthed(false)
    setEmail(null)
    setSessions([])
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <header className="text-center mb-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold grand">
          🔐 Admin Panel
        </h1>
        <p className="text-slate-400 mt-1">Manage auction sessions</p>
      </header>

      {/* Buttons row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Only for signed-in admin */}
        {authed && (
          <button
            onClick={() => router.push('/create')}
            className="btn btn-primary px-6 py-3"
          >
            Create Session
          </button>
        )}
        
        {/* Back to home */}
        <button
          onClick={() => router.push('/')}
          className="btn btn-ghost px-6 py-3"
        >
          Back to Home
        </button>
      </div>

      {/* Sessions list - only show when authenticated */}
      {authed && (
        <div className="w-full flex justify-center">
          {loading ? (
            <div className="text-center text-slate-400 py-8">
              Loading sessions...
            </div>
          ) : (
            <SessionsList 
              sessions={sessions} 
              onDelete={deleteSession} 
              onDeleteParticipant={deleteParticipant} 
              onLoadParticipants={loadParticipants}
            />
          )}
        </div>
      )}

      {/* Auth controls */}
      <div className="mt-2">
        {!authed ? (
          <button className="btn btn-ghost px-4 py-2" onClick={() => setShowLogin((s) => !s)}>
            {showLogin ? 'Close Login' : 'Admin Login'}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300">{email}</span>
            <button className="btn btn-ghost px-4 py-2" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Inline login card (only when requested and not authed) */}
      {!authed && showLogin && <SignInCard onDone={() => setShowLogin(false)} />}

      {/* Small hint while auth state loads on first paint */}
      {!ready && <div className="text-xs text-slate-500">Checking sign-in…</div>}
    </main>
  )
}
