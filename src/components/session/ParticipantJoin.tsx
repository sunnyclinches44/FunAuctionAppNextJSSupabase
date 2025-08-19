import { memo } from 'react'

interface ParticipantJoinProps {
  myName: string
  onNameChange: (name: string) => void
  onSave: () => Promise<void>
  isSaving: boolean
  hasJoined: boolean
  displayName?: string
}

const ParticipantJoin = memo(function ParticipantJoin({ 
  myName, 
  onNameChange, 
  onSave, 
  isSaving, 
  hasJoined, 
  displayName 
}: ParticipantJoinProps) {
  return (
    <div className="card p-4">
      <div className="text-sm text-slate-400 mb-2">Your display name</div>
      <div className="flex gap-2">
        <input
          value={myName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., Sandeep"
          className="flex-1 bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 outline-none"
          disabled={hasJoined}
        />
        <button 
          className="btn btn-ghost px-3 py-2" 
          onClick={onSave}
          disabled={isSaving || hasJoined}
        >
          {isSaving ? 'Saving...' : hasJoined ? 'Joined ✓' : 'Save'}
        </button>
      </div>
      {hasJoined && displayName && (
        <div className="mt-2 text-sm text-green-400">
          ✓ Successfully joined as &quot;{displayName}&quot;
        </div>
      )}
    </div>
  )
})

export default ParticipantJoin
