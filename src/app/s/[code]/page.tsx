'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Session = { id: string; code: string; title: string }
type Participant = {
  id: string
  session_id: string
  user_id: string | null
  device_id: string | null
  display_name: string
  amount: number
}

const AMOUNTS = [5, 10, 15, 20, 50]

function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return ''
  const KEY = 'laddu_device_id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) + ''
    localStorage.setItem(KEY, id)
  }
  return id
}

export default function SessionRoom() {
  const { code } = useParams<{ code: string }>()
  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [myDeviceId, setMyDeviceId] = useState<string>('')
  const [myName, setMyName] = useState<string>('')
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [rtReady, setRtReady] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const total = useMemo(
    () => participants.reduce((a, p) => a + Number(p.amount || 0), 0),
    [participants]
  )

  const myRow = useMemo(
    () => participants.find((p) => p.device_id === myDeviceId) || null,
    [participants, myDeviceId]
  )

  // boot: load deviceId + display name
  useEffect(() => {
    const id = getOrCreateDeviceId()
    setMyDeviceId(id)
    const saved = typeof window !== 'undefined' ? localStorage.getItem('laddu_display_name') || '' : ''
    setMyName(saved)
  }, [])

  // load session + participants (public read)
  useEffect(() => {
    let alive = true
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
      if (!alive) return
      setSession(s as any)

      const { data: parts, error: pe } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', (s as any).id)
        .order('created_at')

      if (pe) { setErrorMsg(pe.message); return }
      if (!alive) return
      setParticipants((parts as any) || [])
    })()
    return () => { alive = false }
  }, [code])

  // realtime subscribe (works for anon)
  useEffect(() => {
    if (!session?.id) return
    const channel = supabase
      .channel(`participants:${session.id}`, { config: { broadcast: { ack: true } } })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` },
        (payload) => setParticipants((prev) => [...prev, payload.new as any])
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` },
        (payload) =>
          setParticipants((prev) => {
            const next = [...prev]
            const i = next.findIndex((p) => p.id === (payload.new as any).id)
            if (i >= 0) next[i] = payload.new as any
            return next
          })
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` },
        (payload) => setParticipants((prev) => prev.filter((p) => p.id !== (payload.old as any).id))
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRtReady(true)
      })

    return () => {
      setRtReady(false)
      supabase.removeChannel(channel)
    }
  }, [session?.id])

  // ----- actions -----

  // Save name + create (or update) my participant row at $0 so buttons appear
  async function saveName() {
    if (!session) return
    const name = (myName || '').trim()
    if (!name) { alert('Please enter your display name.'); return }
    localStorage.setItem('laddu_display_name', name)

    const { data, error } = await supabase.rpc('open_join_session', {
      p_code: session.code,
      p_device: myDeviceId,
      p_name: name,
    })
    if (error) { alert(error.message); return }

    // ensure my row is in the list immediately
    setParticipants((prev) => {
      const next = [...prev]
      const i = next.findIndex((p) => p.device_id === myDeviceId)
      if (i >= 0) next[i] = data as any
      else next.push(data as any)
      return next
    })
  }

  async function place(delta: number) {
    if (!session) return
    const name = (myName || '').trim()
    if (!name) { alert('Please enter your display name first.'); return }

    // optimistic update if I already have a row
    if (myRow) {
      setParticipants((prev) => {
        const next = [...prev]
        const i = next.findIndex((p) => p.id === myRow.id)
        if (i >= 0) next[i] = { ...next[i], amount: Number(next[i].amount || 0) + delta }
        return next
      })
    }

    const { error } = await supabase.rpc('open_place_bid', {
      p_code: session.code,
      p_device: myDeviceId,
      p_name: name,
      p_delta: delta,
    })

    if (error) {
      alert(error.message)
      // revert optimistic change if needed
      if (myRow) {
        setParticipants((prev) => {
          const next = [...prev]
          const i = next.findIndex((p) => p.id === myRow.id)
          if (i >= 0) next[i] = { ...next[i], amount: Number(next[i].amount || 0) - delta }
          return next
        })
      }
    }
  }

  async function placeCustom(pid: string) {
    const v = Number(custom[pid])
    if (!Number.isFinite(v) || v < 5) { alert('Enter a valid number ≥ 5'); return }
    await place(v)
  }

  // ----- render -----
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
      </header>

      <section className="max-w-2xl mx-auto p-4 pb-28 space-y-4">
        {/* Your name (creates your row on Save) */}
        <div className="card p-4">
          <div className="text-sm text-slate-400 mb-2">Your display name</div>
          <div className="flex gap-2">
            <input
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
              placeholder="e.g., Sandeep"
              className="flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 outline-none"
            />
            <button className="btn btn-ghost px-3 py-2" onClick={saveName}>Save</button>
          </div>
        </div>

        {participants.map((p) => {
          const isSelf = p.device_id && p.device_id === myDeviceId
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
                    onClick={() => place(a)}
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
                  onClick={() => placeCustom(p.id)}
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
