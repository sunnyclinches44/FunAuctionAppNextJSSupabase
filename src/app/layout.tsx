import type { Metadata } from 'next'
import './globals.css'
import { DM_Sans, DM_Mono, Source_Serif_4 } from 'next/font/google'
import AuthProvider from '@/components/auth/AuthProvider'
import ThemeScript from '@/components/layout/ThemeScript'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-sans',
  display: 'swap'
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap'
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Fun Auction',
  description: 'Fun • Devotional • Everyone contributes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${sourceSerif.variable} ${dmMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeScript />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
