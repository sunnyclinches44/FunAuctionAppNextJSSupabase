'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Navigation from '@/components/layout/Navigation'
import ModernFooter from '@/components/layout/ModernFooter'

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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-amber-400/10 to-orange-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-blue-400/10 to-cyan-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-400/5 to-emerald-500/5 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-xl mx-auto px-4 py-8 pt-24">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-200 mb-4">
            Create New
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Auction Session
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-md mx-auto">
            Set up a new auction session and get a unique link to share with participants
          </p>
        </div>

        <div className="card p-6 space-y-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
          <div>
            <label className="block text-slate-300 mb-2 font-medium">Session Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/5 border border-white/20 rounded-xl px-4 py-3 w-full outline-none text-slate-200 placeholder-slate-500 focus:border-amber-400/50 transition-colors"
              placeholder="Enter session title"
            />
          </div>

          <button 
            className="btn btn-primary px-6 py-3 w-full text-lg font-semibold" 
            onClick={create} 
            disabled={creating}
          >
            {creating ? 'Creating…' : '✨ Create & Get Link'}
          </button>

          {code && (
            <div className="mt-6 space-y-4 animate-fade-in-up">
              {/* Share link + copy */}
              <div>
                <div className="text-slate-300 mb-2 font-medium">Share link</div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareLink}
                    className="flex-1 bg-white/5 border border-white/20 rounded-xl px-4 py-3 outline-none text-slate-200"
                  />
                  <button className="btn btn-ghost px-4 py-3" onClick={copyLink}>📋 Copy</button>
                  <Link href={`/s/${code}`} className="btn btn-primary px-4 py-3">🚀 Open</Link>
                </div>
              </div>

              {/* QR code */}
              <div>
                <div className="text-slate-300 mb-2 font-medium">QR code</div>
                <div className="bg-white rounded-xl p-4 inline-block">
                  <QRCode value={shareLink} size={168} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ModernFooter />
    </main>
  )
}
