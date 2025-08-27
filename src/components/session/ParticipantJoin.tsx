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

  // Mobile number validation function
  const validateMobileNumber = (number: string): boolean => {
    // Remove all spaces, dashes, and parentheses
    const cleanNumber = number.replace(/[\s\-\(\)]/g, '')
    
    // Australian mobile number patterns
    const auPatterns = [
      /^\+614\d{8}$/,           // +61 4XX XXX XXX
      /^614\d{8}$/,             // 61 4XX XXX XXX (without +)
      /^04\d{8}$/,              // 04XX XXX XXX
      /^4\d{8}$/,               // 4XX XXX XXX (without 0)
    ]
    
    // International patterns (common formats)
    const internationalPatterns = [
      /^\+[1-9]\d{1,14}$/,     // +[country code][number] (E.164 format)
      /^00[1-9]\d{1,14}$/,     // 00[country code][number] (international format)
    ]
    
    // Check if number matches any valid pattern
    const isValid = auPatterns.some(pattern => pattern.test(cleanNumber)) ||
                   internationalPatterns.some(pattern => pattern.test(cleanNumber))
    
    return isValid
  }

  // Validate mobile number on change
  useEffect(() => {
    if (mobileNumber.trim()) {
      const isValid = validateMobileNumber(mobileNumber.trim())
      setIsValidMobile(isValid)
      
      if (!isValid) {
        if (mobileNumber.includes('+61') || mobileNumber.includes('04')) {
          setMobileError('Please enter a valid Australian mobile number (e.g., +61 4XX XXX XXX or 04XX XXX XXX)')
        } else {
          setMobileError('Please enter a valid mobile number with country code (e.g., +61 4XX XXX XXX)')
        }
      } else {
        setMobileError('')
      }
    } else {
      setIsValidMobile(false)
      setMobileError('')
    }
  }, [mobileNumber])

  // Check if form is ready to submit
  const isFormReady = myName.trim() && mobileNumber.trim() && isValidMobile && !mobileError

  return (
    <div className="card p-4 space-y-4">
      <div>
        <div className="text-sm text-slate-400 mb-2">Your display name</div>
        <input
          value={myName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., Sandeep"
          className="w-full bg-white/5 border border-[var(--border)] rounded-xl px-3 py-2 outline-none"
          disabled={hasJoined}
        />
      </div>
      
      <div>
        <div className="text-sm text-slate-400 mb-2">
          Mobile number <span className="text-red-400">*</span>
        </div>
        <input
          type="tel"
          value={mobileNumber}
          onChange={(e) => onMobileNumberChange(e.target.value)}
          placeholder="e.g., +61 4XX XXX XXX"
          className={`w-full bg-white/5 border rounded-xl px-3 py-2 outline-none transition-colors ${
            mobileError && mobileNumber.trim() 
              ? 'border-red-500/50' 
              : isValidMobile && mobileNumber.trim()
              ? 'border-green-500/50'
              : 'border-[var(--border)]'
          }`}
          disabled={hasJoined}
          required
        />
        {mobileError && mobileNumber.trim() && (
          <div className="mt-2 text-sm text-red-400 flex items-center space-x-2">
            <span>⚠️</span>
            <span>{mobileError}</span>
          </div>
        )}
        {isValidMobile && mobileNumber.trim() && (
          <div className="mt-2 text-sm text-green-400 flex items-center space-x-2">
            <span>✓</span>
            <span>Valid mobile number</span>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <button 
          className={`px-3 py-2 flex-1 rounded-xl font-medium transition-all duration-200 ${
            isSaving || hasJoined || !isFormReady
              ? 'bg-slate-600/30 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 hover:scale-105 shadow-lg hover:shadow-blue-500/25'
          }`}
          onClick={onSave}
          disabled={isSaving || hasJoined || !isFormReady}
        >
          {isSaving ? 'Saving...' : hasJoined ? 'Joined ✓' : 'Save'}
        </button>
      </div>
      
      {/* Form Status Indicator */}
      {!hasJoined && (
        <div className="text-center">
          <div className={`text-xs transition-all duration-200 ${
            isFormReady
              ? 'text-green-400' 
              : 'text-slate-500'
          }`}>
            {isFormReady
              ? '✓ Form ready to submit' 
              : 'Please fill in both fields with valid data to continue'
            }
          </div>
        </div>
      )}
      
      {hasJoined && displayName && (
        <div className="mt-2 text-sm text-green-400">
          ✓ Successfully joined as &quot;{displayName}&quot;
        </div>
      )}
    </div>
  )
})

export default ParticipantJoin

