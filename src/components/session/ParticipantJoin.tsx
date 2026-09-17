import { memo, useState, useEffect } from 'react'

interface ParticipantJoinProps {
  myName: string
  onNameChange: (name: string) => void
  mobileNumber: string
  onMobileNumberChange: (mobileNumber: string) => void
  onSave: () => Promise<void>
  isSaving: boolean
  hasJoined: boolean
  displayName?: string
}

// Australian mobiles in their usual written forms, plus E.164 for everyone else.
const MOBILE_PATTERNS = [
  /^\+614\d{8}$/,
  /^614\d{8}$/,
  /^04\d{8}$/,
  /^4\d{8}$/,
  /^\+[1-9]\d{1,14}$/,
  /^00[1-9]\d{1,14}$/
]

export function validateMobileNumber(number: string): boolean {
  const cleanNumber = number.replace(/[\s\-()]/g, '')
  return MOBILE_PATTERNS.some(pattern => pattern.test(cleanNumber))
}

const ParticipantJoin = memo(function ParticipantJoin({
  myName,
  onNameChange,
  mobileNumber,
  onMobileNumberChange,
  onSave,
  isSaving,
  hasJoined,
  displayName
}: ParticipantJoinProps) {
  const [mobileError, setMobileError] = useState<string>('')
  const [isValidMobile, setIsValidMobile] = useState(false)

  useEffect(() => {
    const trimmed = mobileNumber.trim()

    if (!trimmed) {
      setIsValidMobile(false)
      setMobileError('')
      return
    }

    const valid = validateMobileNumber(trimmed)
    setIsValidMobile(valid)
    setMobileError(
      valid ? '' : 'That number does not look right. Try 04XX XXX XXX or +61 4XX XXX XXX.'
    )
  }, [mobileNumber])

  const isFormReady = Boolean(myName.trim()) && isValidMobile

  if (hasJoined) {
    return (
      <p className="text-sm text-live m-0">
        You joined as {displayName}.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="join-name" className="label">
          Your name
        </label>
        <input
          id="join-name"
          value={myName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="How the room will see you"
          className="field"
          autoComplete="name"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="join-mobile" className="label">
          Mobile number
        </label>
        <input
          id="join-mobile"
          type="tel"
          value={mobileNumber}
          onChange={(e) => onMobileNumberChange(e.target.value)}
          placeholder="04XX XXX XXX"
          className={`field num ${
            mobileError ? 'field-bad' : isValidMobile ? 'field-ok' : ''
          }`}
          autoComplete="tel"
          aria-describedby="join-mobile-note"
          required
        />
        <p id="join-mobile-note" className="text-sm m-0 text-ink-3">
          {mobileError ? (
            <span className="text-danger">{mobileError}</span>
          ) : (
            'Only the organiser sees this, for following up on pledges afterwards.'
          )}
        </p>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={onSave}
        disabled={isSaving || !isFormReady}
      >
        {isSaving ? 'Joining…' : 'Join the auction'}
      </button>
    </div>
  )
})

export default ParticipantJoin
