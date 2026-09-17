'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import BrandMark from './BrandMark'
import ThemeToggle from './ThemeToggle'

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Join a session', path: '/join' },
    { label: 'Create a session', path: '/create' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ivory border-b border-hairline">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2.5 py-2"
          >
            <BrandMark size={22} />
            <span className="display text-lg">Fun Auction</span>
          </button>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`px-3 py-2 rounded text-sm transition-colors duration-200 ${
                    active
                      ? 'text-ink font-medium'
                      : 'text-ink-2 hover:text-ink hover:bg-cloud'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1">
            <ThemeToggle />

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              className="md:hidden p-2 rounded text-ink-3 hover:text-ink hover:bg-cloud transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24" aria-hidden="true">
                {isMenuOpen ? (
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-hairline">
            <div className="py-2 flex flex-col">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path)
                    setIsMenuOpen(false)
                  }}
                  className="px-2 py-3 rounded text-left text-ink-2 hover:text-ink hover:bg-cloud transition-colors duration-200"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
