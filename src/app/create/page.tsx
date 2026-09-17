'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Navigation from '@/components/layout/Navigation'
import ModernFooter from '@/components/layout/ModernFooter'
import { ROUNDS } from '@/lib/constants'

// qrcode.react exports named components.
const QRCode = dynamic(() => import('qrcode.react').then(m => m.QRCodeSVG), { ssr: false })

function randomCode(len = 6) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase()
}

export default function CreateSessionPage() {
  const [title, setTitle] = useState('Fun Auction')
  const [code, setCode] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')
  const shareLink = code ? `${origin}/s/${code}` : ''

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  async function create() {
    setCreating(true)
    const c = randomCode(7)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Sign in on the admin page first.')
      setCreating(false)
      return
    }
    // Every session opens in round 1; the column defaults to it.
    const { error } = await supabase.from('sessions').insert({ code: c, title, created_by: user.id })
    setCreating(false)
    if (error) { alert(error.message); return }
    setCode(c)
  }

  async function copyLink() {
    if (!shareLink) return
    await navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Navigation />

      <div className="flex-1 max-w-lg w-full mx-auto px-4 py-12 pt-28">
        <div className="flex flex-col gap-2 mb-8">
          <span className="label">Create</span>
          <h1 className="text-3xl sm:text-4xl">Start a new auction</h1>
          <p className="text-ink-2 m-0">
            You get a code and a QR code to share. The auction opens in round 1.
          </p>
        </div>

        <div className="card p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="session-title" className="label">
              What is this auction for?
            </label>
            <input
              id="session-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
              placeholder="Ganesh Chaturthi Laddu Auction"
            />
          </div>

          {/* What the rounds will do, so the organiser knows what they are running. */}
          <div className="flex flex-col gap-2 pt-1">
            <span className="label">The three rounds</span>
            <ol className="flex flex-col gap-1.5 list-none p-0 m-0">
              {ROUNDS.map((round) => (
                <li key={round.n} className="grid grid-cols-[1.25rem_1fr] gap-2 text-sm">
                  <span className="num text-ink-3">{round.n}</span>
                  <span className="text-ink-2">
                    <span className="text-ink">{round.name}</span>
                    {' · '}
                    {round.custom
                      ? 'any amount from $5 to $10,000'
                      : round.unlocks.map(a => `$${a}`).join(' and ') + ' unlock'}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <button
            className="btn btn-primary"
            onClick={create}
            disabled={creating || !title.trim()}
          >
            {creating ? 'Creating…' : 'Create and get the link'}
          </button>

          {code && (
            <div className="flex flex-col gap-5 pt-5 border-t border-hairline animate-rise">
              <div className="flex flex-col gap-1.5">
                <span className="label">Session code</span>
                <span className="num display text-2xl">{code}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="share-link" className="label">Share link</label>
                <input
                  id="share-link"
                  readOnly
                  value={shareLink}
                  onFocus={(e) => e.currentTarget.select()}
                  className="field num text-sm"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  <button className="btn" onClick={copyLink}>
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                  <Link href={`/s/${code}`} className="btn btn-primary no-underline">
                    Open the session
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="label">QR code</span>
                <div className="bg-white rounded p-4 w-fit border border-hairline">
                  <QRCode value={shareLink} size={168} />
                </div>
                <p className="text-sm text-ink-3 m-0">
                  Put this on the screen and people can join by pointing a camera at it.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ModernFooter />
    </main>
  )
}
