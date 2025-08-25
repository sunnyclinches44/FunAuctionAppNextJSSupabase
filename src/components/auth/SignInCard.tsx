'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function SignInCard() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setBusy(true)
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    })
    setBusy(false)
    if (error) { alert(error.message); return }
    setSent(true)
  }

  return (
    <div className="card p-5 max-w-md mx-auto mt-6">
      <h2 className="text-xl font-bold mb-2">Sign in to continue</h2>
      <p className="text-slate-400 mb-4">We’ll email you a secure magic link.</p>

      {sent ? (
        <div className="text-amber-300">Check your inbox for the magic link.</div>
      ) : (
        <form onSubmit={sendLink} className="flex gap-2">
          <input
            type="email"
            required
            placeholder="you@example.com"
            className="flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 outline-none"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />
          <button disabled={busy} className="btn btn-primary px-4 py-2">
            {busy ? 'Sending…' : 'Send link'}
          </button>
        </form>
      )}
    </div>
  )
}
