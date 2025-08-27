'use client'
import { useAuth } from './AuthProvider'

export default function UserBar() {
  const { user, signOut } = useAuth()
  if (!user) return null
  return (
    <div className="max-w-5xl mx-auto px-4 mt-2 flex items-center justify-end gap-3">
      <span className="text-slate-400 text-sm">{user.email}</span>
      <button className="btn btn-ghost px-3 py-1.5" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  )
}
