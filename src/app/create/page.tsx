'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// IMPORTANT: qrcode.react exports named components. Pick one:
const QRCode = dynamic(() => import('qrcode.react').then(m => m.QRCodeSVG), { ssr: false })

function randomCode(len = 6) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase()
}

export default function CreateSessionPage() {
  const [title, setTitle] = useState('Fun Auction')
  const [code, setCode] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [origin, setOrigin] = useState('')
  const shareLink = code ? `${origin}/s/${code}` : ''

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  async function create() {
    setCreating(true)
    const c = randomCode(7)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Please sign in first.'); setCreating(false); return }
    const { error } = await supabase.from('sessions').insert({ code: c, title, created_by: user.id })
    setCreating(false)
    if (error) { alert(error.message); return }
    setCode(c)
  }

  async function copyLink() {
    if (!shareLink) return
    await navigator.clipboard.writeText(shareLink)
    alert('Link copied!')
  }

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Create Session</h1>

      <div className="card p-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 w-full outline-none"
          placeholder="Session title"
        />

        <button className="btn btn-primary px-4 py-2" onClick={create} disabled={creating}>
          {creating ? 'Creating…' : 'Create & Get Link'}
        </button>

        {code && (
          <div className="mt-4 space-y-3">
            {/* Share link + copy */}
            <div>
              <div className="text-slate-300 mb-1">Share link</div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareLink}
                  className="flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 outline-none"
                />
                <button className="btn btn-ghost px-3 py-2" onClick={copyLink}>Copy</button>
                <Link href={`/s/${code}`} className="btn btn-ghost px-3 py-2">Open</Link>
              </div>
            </div>

            {/* QR code */}
            <div>
              <div className="text-slate-300 mb-1">QR code</div>
              <div className="bg-white rounded-md p-3 inline-block">
                <QRCode value={shareLink} size={168} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
