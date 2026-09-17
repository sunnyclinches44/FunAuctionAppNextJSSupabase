'use client'

import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/constants'

type Theme = 'light' | 'dark'

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStoredTheme(): Theme | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEYS.THEME)
    return saved === 'dark' || saved === 'light' ? saved : null
  } catch {
    return null
  }
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  // Start undecided so the server and the first client render agree; the real
  // theme is already on <html> from ThemeScript by this point.
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(readStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light'))
  }, [])

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      window.localStorage.setItem(STORAGE_KEYS.THEME, next)
    } catch {
      // Choice still applies for this page view, it just will not be remembered.
    }
  }, [theme])

  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to the paper theme' : 'Switch to the navy theme'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={label}
      title={label}
      className={`p-2 rounded text-ink-3 hover:text-ink hover:bg-cloud transition-colors duration-200 ${className}`}
    >
      {isDark ? (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2z" />
        </svg>
      )}
    </button>
  )
}
