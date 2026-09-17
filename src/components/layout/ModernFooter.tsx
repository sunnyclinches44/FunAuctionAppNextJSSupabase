'use client'

import { useRouter } from 'next/navigation'
import BrandMark from './BrandMark'

export default function ModernFooter() {
  const router = useRouter()

  const links = [
    { label: 'Join a session', path: '/join' },
    { label: 'Create a session', path: '/create' },
    { label: 'Admin', path: '/admin' },
  ]

  return (
    <footer className="border-t border-hairline bg-ivory mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">
          <div className="flex flex-col gap-3 max-w-sm">
            <div className="flex items-center gap-2.5">
              <BrandMark size={20} />
              <span className="display text-base">Fun Auction</span>
            </div>
            <p className="text-sm text-ink-3 m-0">
              Real-time group bidding for community events. No account needed to join,
              just a code and a name.
            </p>
          </div>

          <nav className="flex flex-col gap-2">
            <span className="label">Go to</span>
            {links.map((link) => (
              <button
                key={link.path}
                onClick={() => router.push(link.path)}
                className="text-sm text-ink-2 hover:text-ink transition-colors duration-200 text-left"
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="border-t border-hairline mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="text-sm text-ink-3">
            © {new Date().getFullYear()} Fun Auction
          </span>
          <span className="text-sm text-ink-3">
            Built by SSM One Pty Ltd
          </span>
        </div>
      </div>
    </footer>
  )
}
