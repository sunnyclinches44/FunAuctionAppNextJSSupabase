'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Session = { id: string; code: string; title: string }
type Participant = {
  id: string
  session_id: string
  user_id: string
  display_name: string
  amount: number
}

const AMOUNTS = [5, 10, 15, 20, 50]

/** Simple inline sign-in card using Supabase magic link */
function SignInCard() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const redirectTo = typeof window !== 'undefined' ? window.location.href : undefined
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    setBusy(false)
    if (error) return alert(error.message)
    setSent(true)
  }

  return (
    <div className="card p-5 max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-2">Sign in to join this session</h2>
      {sent ? (
        <div className="text-amber-300">Magic link sent. Check your inbox.</div>
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
          <button disabled={busy} className="btn btn-primary px-4 py-2">
            {busy ? 'Sending…' : 'Send link'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function SessionRoom() {
  const { code } = useParams<{ code: string }>()
  const [authReady, setAuthReady] = useState(false)
  const [authed, setAuthed] = useState(false)

  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [me, setMe] = useState<Participant | null>(null)
  const [name, setName] = useState('')
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [rtReady, setRtReady] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const total = useMemo(
    () => participants.reduce((a, p) => a + Number(p.amount || 0), 0),
    [participants]
  )

  // 0) Wait for auth state
  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setAuthed(!!data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setAuthed(!!sess)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // 1) Load session + current participants (after auth is ready)
  useEffect(() => {
    if (!authReady || !authed) return
    let alive = true
    ;(async () => {
      setErrorMsg(null)

      // fetch session by code (RLS requires authenticated user)
      const { data: s, error: se } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle()

      if (se || !s) {
        setErrorMsg(se?.message || 'Session not found or not accessible.')
        return
      }
      if (!alive) return

      setSession(s as any)

      // fetch participants
      const { data: parts, error: pe } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', (s as any).id)
        .order('created_at')

      if (pe) {
        setErrorMsg(pe.message)
        return
      }
      if (!alive) return

      setParticipants((parts as any) || [])

      const { data: { user } } = await supabase.auth.getUser()
      const mine =
        ((parts as any) || []).find((p: Participant) => p.user_id === user?.id) || null
      setMe(mine)
    })()
    return () => {
      alive = false
    }
  }, [authReady, authed, code])

  // 2) Realtime: subscribe when we have the session UUID
  useEffect(() => {
    if (!session?.id || !authed) return

    const channel = supabase
      .channel(`participants:${session.id}`, { config: { broadcast: { ack: true } } })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` },
        (payload) => {
          console.log('[RT] INSERT', payload)
          setParticipants((prev) => [...prev, payload.new as any])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` },
        (payload) => {
          console.log('[RT] UPDATE', payload)
          setParticipants((prev) => {
            const next = [...prev]
            const i = next.findIndex((p) => p.id === (payload.new as any).id)
            if (i >= 0) next[i] = payload.new as any
            return next
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` },
        (payload) => {
          console.log('[RT] DELETE', payload)
          setParticipants((prev) => prev.filter((p) => p.id !== (payload.old as any).id))
        }
      )
      .subscribe((status) => {
        console.log('[RT] status:', status)
        if (status === 'SUBSCRIBED') setRtReady(true)
      })

    return () => {
      setRtReady(false)
      supabase.removeChannel(channel)
    }
  }, [session?.id, authed])

  // Actions
  async function join() {
    if (!session) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert('Please sign in first')

    const { data, error } = await supabase
      .from('participants')
      .insert({ session_id: session.id, user_id: user.id, display_name: name })
      .select('*')
      .single()

    if (error) return alert(error.message)
    setMe(data as any)
    setParticipants((prev) => [...prev, data as any])
  }

  async function bid(delta: number) {
    if (!session || !me) return
    // optimistic
    setParticipants((prev) => {
      const next = [...prev]
      const i = next.findIndex((p) => p.id === me.id)
      if (i >= 0) next[i] = { ...next[i], amount: Number(next[i].amount || 0) + delta }
      return next
    })
    const { error } = await supabase.rpc('place_bid', { p_session: session.id, p_delta: delta })
    if (error) {
      console.error(error)
      alert(error.message)
      // revert
      setParticipants((prev) => {
        const next = [...prev]
        const i = next.findIndex((p) => p.id === me.id)
        if (i >= 0) next[i] = { ...next[i], amount: Number(next[i].amount || 0) - delta }
        return next
      })
    }
  }

  async function bidCustom(pid: string) {
    if (!session || !me) return
    const v = Number(custom[pid])
    if (!Number.isFinite(v) || v < 5) return alert('Enter a valid number ≥ 5')
    // optimistic
    setParticipants((prev) => {
      const next = [...prev]
      const i = next.findIndex((p) => p.id === me.id)
      if (i >= 0) next[i] = { ...next[i], amount: Number(next[i].amount || 0) + v }
      return next
    })
    const { error } = await supabase.rpc('place_bid', { p_session: session.id, p_delta: v })
    if (error) {
      console.error(error)
      alert(error.message)
      // revert
      setParticipants((prev) => {
        const next = [...prev]
        const i = next.findIndex((p) => p.id === me.id)
        if (i >= 0) next[i] = { ...next[i], amount: Number(next[i].amount || 0) - v }
        return next
      })
    }
  }

  // --------- Render states ---------
  if (!authReady) return <main className="max-w-2xl mx-auto p-6 text-slate-400">Loading…</main>

  if (!authed) {
    return (
      <main className="relative z-10">
        <header className="text-center pt-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold grand">🙏 Ganesh Chaturthi Laddu Auction</h1>
          <div className="text-slate-400 mt-1">Sign in to join this session</div>
        </header>
        <SignInCard />
      </main>
    )
  }

  if (errorMsg) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <div className="card p-5">
          <div className="text-red-300 font-semibold mb-2">Error</div>
          <div className="text-slate-300">{errorMsg}</div>
        </div>
      </main>
    )
  }

  // Not joined yet → show join form
  if (session && !me) {
    return (
      <main className="max-w-xl mx-auto p-4">
        <div className="card p-4 space-y-3">
          <h1 className="text-2xl font-bold">{session?.title || 'Session'}</h1>
          <p className="text-slate-400 -mt-1">Join this session with a display name.</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 w-full outline-none"
          />
          <button className="btn btn-primary px-4 py-2" onClick={join}>Join Session</button>
        </div>
      </main>
    )
  }

  // Main live view
  return (
    <main className="relative z-10">
      <header className="text-center pt-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold grand">🙏 Ganesh Chaturthi Laddu Auction</h1>
        <div className="text-slate-400 mt-1">{session?.title || 'Live Session'}</div>
        <div className={`mt-2 text-xs ${rtReady ? 'text-green-400' : 'text-slate-500'}`}>
          Realtime: {rtReady ? 'connected' : 'connecting…'}
        </div>
      </header>

      <section className="max-w-2xl mx-auto p-4 pb-28 space-y-4">
        {participants.map((p) => {
          const isSelf = p.user_id === me!.user_id
          return (
            <div key={p.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">{p.display_name}</div>
                <div className="text-slate-400 hidden sm:block">Contribution</div>
              </div>
              <div className="mt-1 text-2xl font-extrabold">${Number(p.amount || 0)}</div>

              <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-start">
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    disabled={!isSelf}
                    className={`btn px-3 py-2 rounded-lg ${
                      isSelf
                        ? 'bg-[var(--neon)] text-neutral-900 shadow-neon hover:shadow-neonHover'
                        : 'bg-white/10 text-slate-400 cursor-not-allowed'
                    }`}
                    onClick={() => bid(a)}
                  >
                    +${a}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  disabled={!isSelf}
                  value={custom[p.id] ?? ''}
                  onChange={(e) => setCustom((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Custom amount (≥ $5)"
                  className={`min-w-[180px] flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 outline-none ${
                    !isSelf ? 'opacity-60' : ''
                  }`}
                />
                <button
                  disabled={!isSelf}
                  className={`btn px-4 py-2 rounded-lg ${
                    isSelf
                      ? 'bg-[var(--neon)] text-neutral-900 shadow-neon hover:shadow-neonHover'
                      : 'bg-white/10 text-slate-400 cursor-not-allowed'
                  }`}
                  onClick={() => bidCustom(p.id)}
                >
                  + Custom
                </button>
              </div>
            </div>
          )
        })}
      </section>

      <div className="stickyTotal">
        <div className="w-full max-w-2xl flex items-center justify-between p-3">
          <div className="text-slate-400">Grand Total</div>
          <div className="grand text-2xl">${total}</div>
        </div>
      </div>
    </main>
  )
}
