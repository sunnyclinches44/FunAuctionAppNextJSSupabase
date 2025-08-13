'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

// Configuration constants
const AUCTION_CONFIG = {
  MIN_BID_AMOUNT: 5,
  MAX_BID_AMOUNT: 10000,
  PRESET_AMOUNTS: [5, 10, 15, 20, 50] as const,
  DEVICE_ID_KEY: 'laddu_device_id',
  DISPLAY_NAME_KEY: 'laddu_display_name'
} as const

type Session = { id: string; code: string; title: string }
type Participant = {
  id: string
  session_id: string
  user_id: string | null
  device_id: string | null
  display_name: string
  amount: number
}

function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return ''
  const KEY = AUCTION_CONFIG.DEVICE_ID_KEY
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
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)
  const [isPlacingBid, setIsPlacingBid] = useState<string | null>(null)

  const total = useMemo(
    () => participants.reduce((a, p) => a + Number(p.amount || 0), 0),
    [participants]
  )

  const myRow = useMemo(
    () => participants.find((p) => p.device_id === myDeviceId) || null,
    [participants, myDeviceId]
  )

  // Memoize active participants for better performance
  const activeParticipants = useMemo(
    () => participants.filter(p => Number(p.amount || 0) > 0),
    [participants]
  )

  // Memoize participants count
  const participantsCount = useMemo(
    () => participants.length,
    [participants]
  )

  // boot: load deviceId + display name
  useEffect(() => {
    const id = getOrCreateDeviceId()
    setMyDeviceId(id)
    const saved = typeof window !== 'undefined' ? localStorage.getItem(AUCTION_CONFIG.DISPLAY_NAME_KEY) || '' : ''
    setMyName(saved)
  }, [])

  // load session + participants using RPC function
  useEffect(() => {
    let alive = true
    setIsLoading(true)
    ;(async () => {
      setErrorMsg(null)

      try {
        // Use RPC function to get session details
        const { data: sessionData, error: sessionError } = await supabase.rpc('get_session_details', {
          p_session_code: code
        })

        if (sessionError) {
          console.error('Error getting session details:', sessionError)
          setErrorMsg(sessionError.message || 'Session not found or not accessible.')
          setIsLoading(false)
          return
        }

        if (!alive) return

        // Set session data
        setSession({
          id: sessionData.session.id,
          code: sessionData.session.code,
          title: sessionData.session.title
        })

        // Set participants data
        setParticipants(sessionData.participants || [])
        
        console.log('Session loaded successfully:', sessionData)
        
      } catch (error) {
        console.error('Error loading session:', error)
        setErrorMsg('Failed to load session')
      } finally {
        setIsLoading(false)
      }
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

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key closes custom input modal
      if (e.key === 'Escape' && showCustomInput) {
        setShowCustomInput(null)
        setCustomAmount('')
      }
      
      // Enter key in custom amount input
      if (e.key === 'Enter' && showCustomInput && customAmount.trim()) {
        const validation = validateCustomAmount(customAmount)
        if (validation.valid) {
          handleCustomAmount(showCustomInput)
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showCustomInput, customAmount])

  // ----- actions -----

  // Save name + create (or update) my participant row using RPC function
  async function saveName() {
    const name = (myName || '').trim()
    if (!name) { 
      alert('Please enter your display name.'); 
      return 
    }
    
    if (name.length < 2) {
      alert('Display name must be at least 2 characters long.')
      return
    }
    
    if (name.length > 50) {
      alert('Display name cannot exceed 50 characters.')
      return
    }
    
    if (!session) {
      alert('Session not loaded yet. Please wait.')
      return
    }
    
    setIsSavingName(true)
    localStorage.setItem(AUCTION_CONFIG.DISPLAY_NAME_KEY, name)

    try {
      // Use RPC function to join session
      const { data, error } = await supabase.rpc('join_session', {
        p_session_code: session.code,
        p_display_name: name,
        p_device_id: myDeviceId
      })

      if (error) {
        console.error('Error joining session:', error)
        throw error
      }

      console.log('Session join result:', data)
      
      if (data.success) {
        console.log(`Participant ${data.action} successfully`)
        // The real-time subscription will handle updating the UI
      } else {
        throw new Error('Failed to join session')
      }
      
    } catch (error) {
      console.error('Error saving name:', error)
      alert(`Failed to save your name: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSavingName(false)
    }
  }

  async function place(delta: number) {
    if (!myRow || !session) return

    setIsPlacingBid(myRow.id)
    
    try {
      // Optimistic update
      setParticipants((prev) => {
        const next = [...prev]
        const i = next.findIndex((p) => p.id === myRow.id)
        if (i >= 0) next[i] = { ...next[i], amount: Number(next[i].amount || 0) + delta }
        return next
      })

      // Use RPC function to place bid
      const { data, error } = await supabase.rpc('place_bid', {
        p_session_code: session.code,
        p_device_id: myDeviceId,
        p_amount: delta
      })

      if (error) {
        console.error('Error placing bid:', error)
        throw error
      }

      console.log('Bid placed successfully:', data)
      
      // The real-time subscription will handle updating the UI with the actual data
      
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
    } finally {
      setIsPlacingBid(null)
    }
  }

  // Validation function for custom amounts
  const validateCustomAmount = (amount: string): { valid: boolean; error?: string } => {
    if (!amount || amount.trim() === '') {
      return { valid: false, error: 'Amount is required' }
    }
    
    const num = Number(amount)
    if (!Number.isFinite(num)) {
      return { valid: false, error: 'Invalid number format' }
    }
    
    if (num < AUCTION_CONFIG.MIN_BID_AMOUNT) {
      return { valid: false, error: `Amount must be at least $${AUCTION_CONFIG.MIN_BID_AMOUNT}` }
    }
    
    if (num > AUCTION_CONFIG.MAX_BID_AMOUNT) {
      return { valid: false, error: `Amount cannot exceed $${AUCTION_CONFIG.MAX_BID_AMOUNT}` }
    }
    
    return { valid: true }
  }

  async function handleCustomAmount(pid: string) {
    const validation = validateCustomAmount(customAmount)
    
    if (!validation.valid) {
      alert(validation.error)
      return
    }
    
    const amount = Number(customAmount)
    
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
              disabled={!!myRow} // Disable if user has already joined
            />
            <button 
              className="btn btn-ghost px-3 py-2" 
              onClick={saveName}
              disabled={isSavingName || !!myRow} // Disable if already joined
            >
              {isSavingName ? 'Saving...' : myRow ? 'Joined ✓' : 'Save'}
            </button>
          </div>
          {myRow && (
            <div className="mt-2 text-sm text-green-400">
              ✓ Successfully joined as "{myRow.display_name}"
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-slate-400">Loading session...</p>
          </div>
        ) : (
          participants.map((p) => {
            const isSelf = p.device_id && p.device_id === myDeviceId
            return (
              <div key={p.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">{p.display_name}</div>
                  <div className="text-slate-400 hidden sm:block">Contribution</div>
                </div>
                <div className="mt-1 text-2xl font-extrabold">${Number(p.amount || 0)}</div>

                {/* Only show bid buttons for current user */}
                {isSelf ? (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-start">
                    {AUCTION_CONFIG.PRESET_AMOUNTS.map((a) => (
                      <button
                        key={a}
                        disabled={isPlacingBid === p.id}
                        className={`btn px-3 py-2 rounded-lg ${
                          isPlacingBid !== p.id
                            ? 'bg-[var(--neon)] text-neutral-900 shadow-neon hover:shadow-neonHover'
                            : 'bg-white/10 text-slate-400 cursor-not-allowed'
                        }`}
                        onClick={() => place(a)}
                      >
                        {isPlacingBid === p.id ? '...' : `+$${a}`}
                      </button>
                    ))}
                    
                    {/* Custom Amount Button */}
                    <button
                      disabled={isPlacingBid === p.id}
                      className={`btn px-3 py-2 rounded-lg ${
                        isPlacingBid !== p.id
                          ? 'bg-[var(--neon)] text-neutral-900 shadow-neon hover:shadow-neonHover'
                          : 'bg-white/10 text-slate-400 cursor-not-allowed'
                      }`}
                      onClick={() => {
                        setShowCustomInput(p.id)
                        setCustomAmount('')
                      }}
                    >
                      Custom
                    </button>
                  </div>
                ) : null}

                {/* Custom Amount Modal - only show for current user */}
                {isSelf && showCustomInput === p.id && (
                  <div className="mt-4 p-4 bg-slate-800/50 border border-slate-600 rounded-xl backdrop-blur-sm">
                    <div className="text-sm text-slate-300 mb-3">Enter custom amount (≥ $5)</div>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        min={AUCTION_CONFIG.MIN_BID_AMOUNT}
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
                        disabled={!customAmount || Number(customAmount) < AUCTION_CONFIG.MIN_BID_AMOUNT}
                        className={`btn px-3 py-2 rounded-lg ${
                          customAmount && Number(customAmount) >= AUCTION_CONFIG.MIN_BID_AMOUNT
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
          })
        )}
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