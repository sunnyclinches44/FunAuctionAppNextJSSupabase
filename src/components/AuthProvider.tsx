'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type AuthCtx = {
  user: import('@supabase/supabase-js').User | null
  loading: boolean
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, signOut: async () => {} })
export const useAuth = () => useContext(Ctx)

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // 1) get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // 2) subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => { 
      mounted = false; 
      sub.subscription.unsubscribe() 
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider value={{ user, loading, signOut: handleSignOut }}>
      {children}
    </Ctx.Provider>
  )
}