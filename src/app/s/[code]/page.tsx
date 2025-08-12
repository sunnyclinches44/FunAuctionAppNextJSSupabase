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
  const [showCustomInput, setShowCustomInput] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState('')

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

    try {
      // Check if participant already exists for this device
      const { data: existingParticipant, error: checkError } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', session.id)
        .eq('device_id', myDeviceId)
        .maybeSingle()

      if (checkError) throw checkError

      if (existingParticipant) {
        // Update existing participant
        const { error: updateError } = await supabase
          .from('participants')
          .update({ display_name: name })
          .eq('id', existingParticipant.id)

        if (updateError) throw updateError
      } else {
        // Create new participant
        const { error: insertError } = await supabase
          .from('participants')
          .insert({
            session_id: session.id,
            device_id: myDeviceId,
            display_name: name,
            amount: 0
          })

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error('Error saving name:', error)
      alert('Failed to save name. Please try again.')
    }
  }

  async function place(delta: number) {
    if (!session || !myRow) return
    const name = (myName || '').trim()
    if (!name) { alert('Please enter your display name first.'); return }

    // optimistic update
    setParticipants((prev) => {
      const next = [...prev]
      const i = next.findIndex((p) => p.id === myRow.id)
      if (i >= 0) next[i] = { ...next[i], amount: Number(next[i].amount || 0) + delta }
      return next
    })

    try {
      // Update participant amount directly
      const { error: updateError } = await supabase
        .from('participants')
        .update({ amount: Number(myRow.amount || 0) + delta })
        .eq('id', myRow.id)

      if (updateError) throw updateError

      // Insert bid record
      const { error: bidError } = await supabase
        .from('bids')
        .insert({
          session_id: session.id,
          participant_id: myRow.id,
          delta: delta
        })

      if (bidError) throw bidError

    } catch (error) {
      console.error('Error placing bid:', error)
      alert(error instanceof Error ? error.message : 'Failed to place bid')
      
      // revert optimistic change
      setParticipants((prev) => {
        const next = [...prev]
        const i = next.findIndex((p) => p.id === myRow.id)
        if (i >= 0) next[i] = { ...next[i], amount: Number(next[i].amount || 0) - delta }
        return next
      })
    }
  }

  async function handleCustomAmount(pid: string) {
    if (!customAmount || customAmount.trim() === '') {
      alert('Please enter a custom amount')
      return
    }
    
    const amount = Number(customAmount)
    if (!Number.isFinite(amount) || amount < 5) { 
      alert('Enter a valid number ≥ 5'); 
      return 
    }
    
    try {
      await place(amount)
      // Close the modal and clear input
      setShowCustomInput(null)
      setCustomAmount('')
    } catch (error) {
      console.error('Error placing custom bid:', error)
    }
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
        <h1 className="text-3xl sm:text-4xl font-extrabold grand">🙏 Fun Auction</h1>
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
                
                {/* Custom Amount Button */}
                <button
                  disabled={!isSelf}
                  className={`btn px-3 py-2 rounded-lg ${
                    isSelf
                      ? 'bg-[var(--neon)] text-neutral-900 shadow-neon hover:shadow-neonHover'
                      : 'bg-white/10 text-slate-400 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (isSelf) {
                      setShowCustomInput(p.id)
                      setCustomAmount('')
                    }
                  }}
                >
                  Custom
                </button>
              </div>

              {/* Custom Amount Modal */}
              {showCustomInput === p.id && (
                <div className="mt-4 p-4 bg-slate-800/50 border border-slate-600 rounded-xl backdrop-blur-sm">
                  <div className="text-sm text-slate-300 mb-3">Enter custom amount (≥ $5)</div>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      min="5"
                      step="1"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomAmount(p.id)
                        } else if (e.key === 'Escape') {
                          setShowCustomInput(null)
                          setCustomAmount('')
                        }
                      }}
                      placeholder="Enter amount..."
                      className="flex-1 bg-white/10 border border-slate-500 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      autoFocus
                    />
                    <button
                      onClick={() => handleCustomAmount(p.id)}
                      disabled={!customAmount || Number(customAmount) < 5}
                      className={`btn px-3 py-2 rounded-lg ${
                        isSelf && customAmount && Number(customAmount) >= 5
                          ? 'bg-[var(--neon)] text-neutral-900 shadow-neon hover:shadow-neonHover'
                          : 'bg-white/10 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomInput(null)
                        setCustomAmount('')
                      }}
                      className="btn bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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