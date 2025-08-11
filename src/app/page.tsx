'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function SignInCard({ onDone }: { onDone?: () => void }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const redirectTo =
      typeof window !== 'undefined' ? window.location.origin + '/create' : undefined
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
          Magic link sent. After you click it, you’ll return here.
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

export default function Home() {
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [ready, setReady] = useState(false)

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

  async function signOut() {
    await supabase.auth.signOut()
    setAuthed(false)
    setEmail(null)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <header className="text-center mb-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold grand">
          🙏 Ganesh Chaturthi Laddu Auction
        </h1>
        <p className="text-slate-400 mt-1">Fun • Devotional • Everyone contributes</p>
      </header>

      {/* Buttons row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Always visible */}
        <button
          onClick={() => router.push('/join')}
          className="btn btn-ghost px-6 py-3"
        >
          Join Session
        </button>

        {/* Only for signed-in admin */}
        {authed && (
          <button
            onClick={() => router.push('/create')}
            className="btn btn-primary px-6 py-3"
          >
            Create Session
          </button>
        )}
      </div>

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
