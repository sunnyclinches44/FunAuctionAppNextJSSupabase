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

/** Magic-link sign-in card (shown on demand) */
function SignInCard({ onClose }: { onClose?: () => void }) {
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
    <div className="card p-5 max-w-md mx-auto mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">Sign in to bid</h2>
        {onClose && (
          <button className="btn btn-ghost px-2 py-1 text-sm" onClick={onClose}>Close</button>
        )}
      </div>
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
  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [me, setMe] = useState<Participant | null>(null)
  const [authed, setAuthed] = useState(false)
  const [name, setName] = useState('')
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [rtReady, setRtReady] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showSignin, setShowSignin] = useState(false)

  const total = useMemo(
    () => participants.reduce((a, p) => a + Number(p.amount || 0), 0),
    [participants]
  )

  // Auth state (optional for viewing; required for bidding)
  useEffect(() => {
    let live = true
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return
      setAuthed(!!data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setAuthed(!!sess)
    })
    return () => {
      live = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Load session + members (publicly readable)
  useEffect(() => {
    let live = true
    ;(async () => {
      setErrorMsg(null)

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
      if (!live) return
      setSession(s as any)

      const { data: parts, error: pe } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', (s as any).id)
        .order('created_at')

      if (pe) {
        setErrorMsg(pe.message)
        return
      }
      if (!live) return
      setParticipants((parts as any) || [])

      // If signed-in, detect my row
      const { data: { user } } = await supabase.auth.getUser()
      const mine =
        ((parts as any) || []).find((p: Participant) => p.user_id === user?.id) || null
      setMe(mine)
    })()
    return () => { live = false }
  }, [code, authed]) // re-check "me" if auth flips

  // Realtime: works for anon and authed
  useEffect(() => {
    if (!session?.id) return
    const channel = supabase
      .channel(`participants:${session.id}`, { config: { broadcast: { ack: true } } })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` },
        (payload) => {
          // console.log('[RT] INSERT', payload)
          setParticipants((prev) => [...prev, payload.new as any])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` },
        (payload) => {
          // console.log('[RT] UPDATE', payload)
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
          // console.log('[RT] DELETE', payload)
          setParticipants((prev) => prev.filter((p) => p.id !== (payload.old as any).id))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRtReady(true)
      })

    return () => {
      setRtReady(false)
      supabase.removeChannel(channel)
    }
  }, [session?.id])

  // Actions
  async function join() {
    if (!session) return
    if (!authed) { setShowSignin(true); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setShowSignin(true); return }

    const { data, error } = await supabase
      .from('participants')
      .insert({ session_id: session.id, user_id: user.id, display_name: name })
      .select('*').single()

    if (error) return alert(error.message)
    setMe(data as any)
    setParticipants((prev) => [...prev, data as any])
    setShowSignin(false)
  }

  async function bid(delta: number) {
    if (!session || !me) { setShowSignin(true); return }
    // optimistic
    setParticipants((prev) => {
      const next = [...prev]
      const i = next.findIndex((p) => p.id === me.id)
      if (i >= 0) next[i] = { ...next[i], amount: Number(next[i].amount || 0) + delta }
      return next
    })
    const { error } = await supabase.rpc('place_bid', { p_session: session.id, p_delta: delta })
    if (error) {
      alert(error.message)
      setParticipants((prev) => {
        const next = [...prev]
        const i = next.findIndex((p) => p.id === me.id)
        if (i >= 0) next[i] = { ...next[i], amount: Number(next[i].amount || 0) - delta }
        return next
      })
    }
  }

  async function bidCustom(pid: string) {
    if (!session || !me) { setShowSignin(true); return }
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
      alert(error.message)
      setParticipants((prev) => {
        const next = [...prev]
        const i = next.findIndex((p) => p.id === me.id)
        if (i >= 0) next[i] = { ...next[i], amount: Number(next[i].amount || 0) - v }
        return next
      })
    }
  }

  // -------- Render --------
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

  return (
    <main className="relative z-10">
      <header className="text-center pt-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold grand">🙏 Ganesh Chaturthi Laddu Auction</h1>
        <div className="text-slate-400 mt-1">{session?.title || 'Live Session'}</div>
        <div className={`mt-2 text-xs ${rtReady ? 'text-green-400' : 'text-slate-500'}`}>
          Realtime: {rtReady ? 'connected' : 'connecting…'}
        </div>

        {!me && (
          <div className="mt-3">
            <button className="btn btn-primary px-4 py-2" onClick={() => setShowSignin(true)}>
              Sign in to bid / join
            </button>
          </div>
        )}
      </header>

      {/* Join form appears only if authed but not yet joined */}
      {authed && !me && (
        <section className="max-w-xl mx-auto p-4">
          <div className="card p-4 space-y-3">
            <div className="text-lg font-semibold">Join this session</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              className="bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 w-full outline-none"
            />
            <button className="btn btn-primary px-4 py-2" onClick={join}>Join Session</button>
          </div>
        </section>
      )}

      {/* Main list (always visible to spectators) */}
      <section className="max-w-2xl mx-auto p-4 pb-28 space-y-4">
        {participants.map((p) => {
          const isSelf = !!me && p.user_id === me.user_id
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

      {showSignin && !authed && <SignInCard onClose={() => setShowSignin(false)} />}
    </main>
  )
}
