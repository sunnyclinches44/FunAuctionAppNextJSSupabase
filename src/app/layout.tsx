import type { Metadata } from 'next'
import './globals.css'
import { Plus_Jakarta_Sans } from 'next/font/google'
import AuthProvider from '@/components/AuthProvider'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400','600','800'] })

export const metadata: Metadata = {
  title: 'Ganesh Chaturthi Laddu Auction',
  description: 'Fun • Devotional • Everyone contributes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={jakarta.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
