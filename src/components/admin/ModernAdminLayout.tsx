'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RoundControl from './RoundControl'
import { FINAL_ROUND, normalizeRound } from '@/lib/constants'
import { normalizeQuizPhase } from '@/lib/quiz'

const quizPhaseLabel = {
  idle: null,
  question_open: 'Quiz question live',
  question_revealed: 'Quiz answer shown',
  finished: 'Quiz finished'
} as const

interface Session {
  id: string
  code: string
  title: string
  created_at: string
  participant_count: number
  total_amount: number
  current_round: number
  quiz_phase?: string
}

interface Participant {
  id: string
  display_name: string
  mobile_number: string
  amount: number
  device_id: string
  created_at: string
}

interface ModernAdminLayoutProps {
  sessions: Session[]
  onDelete: (sessionId: string) => void
  onDeleteParticipant: (participantId: string, sessionId: string) => void
  onLoadParticipants: (sessionId: string) => Promise<Participant[]>
  onCreateSession: () => void
  onChangeRound: (sessionCode: string, round: number) => Promise<boolean>
}

export default function ModernAdminLayout({
  sessions,
  onDelete,
  onDeleteParticipant,
  onLoadParticipants,
  onCreateSession,
  onChangeRound
}: ModernAdminLayoutProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({})
  const [loadingParticipants, setLoadingParticipants] = useState<Set<string>>(new Set())

  const handleDelete = async (sessionId: string, title: string) => {
    if (!confirm(`Delete "${title}"? Its participants and every bid go with it. This cannot be undone.`)) {
      return
    }

    setDeleting(sessionId)
    try {
      onDelete(sessionId)
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteParticipant = async (participantId: string, sessionId: string, participantName: string) => {
    if (!confirm(`Remove ${participantName}? Their bids are removed too.`)) {
      return
    }

    try {
      onDeleteParticipant(participantId, sessionId)
      const updatedParticipants = await onLoadParticipants(sessionId)
      setParticipants(prev => ({ ...prev, [sessionId]: updatedParticipants }))
    } catch (error) {
      console.error('Error deleting participant:', error)
    }
  }

  const toggleSessionExpansion = async (sessionId: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
      if (!participants[sessionId]) {
        setLoadingParticipants(prev => new Set(prev).add(sessionId))
        try {
          const sessionParticipants = await onLoadParticipants(sessionId)
          setParticipants(prev => ({ ...prev, [sessionId]: sessionParticipants }))
        } catch (error) {
          console.error('Error loading participants:', error)
        } finally {
          setLoadingParticipants(prev => {
            const newSet = new Set(prev)
            newSet.delete(sessionId)
            return newSet
          })
        }
      }
    }
    setExpandedSessions(newExpanded)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-hairline">
        <div className="flex flex-col gap-1">
          <span className="label">Admin</span>
          <h1 className="text-2xl sm:text-3xl">Your auction sessions</h1>
        </div>
        <button onClick={onCreateSession} className="btn btn-primary">
          Create a session
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="py-16 text-center">
          <h3 className="text-xl mb-2">No sessions yet</h3>
          <p className="text-ink-3 mb-6">Create one to get a link and a QR code to share.</p>
          <button onClick={onCreateSession} className="btn btn-primary">
            Create a session
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {sessions.map((session) => {
            const expanded = expandedSessions.has(session.id)
            const round = normalizeRound(session.current_round)
            const quizLabel = quizPhaseLabel[normalizeQuizPhase(session.quiz_phase)]
            return (
              <div key={session.id} className="card p-5 flex flex-col gap-5">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="text-xl truncate">{session.title}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="num text-sm text-ink-3 border border-hairline rounded px-2 py-0.5">
                        {session.code}
                      </span>
                      <span className="pill pill-accent">
                        Round {round} of {FINAL_ROUND}
                      </span>
                      {quizLabel && (
                        <span className="pill pill-live">
                          <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                          {quizLabel}
                        </span>
                      )}
                      <span className="text-sm text-ink-3">
                        {new Date(session.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="text-right">
                      <div className="display text-2xl num leading-none">
                        ${Number(session.total_amount || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-ink-3">
                        {session.participant_count} {session.participant_count === 1 ? 'bidder' : 'bidders'}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleSessionExpansion(session.id)}
                      aria-expanded={expanded}
                      aria-label={expanded ? 'Hide bidders' : 'Show bidders'}
                      className="p-2 rounded text-ink-3 hover:text-ink hover:bg-cloud transition-colors duration-200"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Round control: the one live action during an event. */}
                <RoundControl
                  sessionCode={session.code}
                  currentRound={round}
                  onChangeRound={onChangeRound}
                />

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push(`/s/${session.code}`)}
                      className="btn"
                    >
                      Open session
                    </button>
                    <button
                      onClick={() => router.push(`/admin/quiz/${session.code}`)}
                      className="btn"
                    >
                      Run the quiz
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/s/${session.code}`)
                      }}
                      className="btn btn-ghost"
                    >
                      Copy join link
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(session.id, session.title)}
                    disabled={deleting === session.id}
                    className="btn btn-danger"
                  >
                    {deleting === session.id ? 'Deleting…' : 'Delete session'}
                  </button>
                </div>

                {/* Bidders */}
                {expanded && (
                  <div className="pt-5 border-t border-hairline animate-rise flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="label">Bidders</span>
                      <p className="text-sm text-ink-3 m-0">
                        Mobile numbers are shown here only, for following up on pledges.
                      </p>
                    </div>

                    {loadingParticipants.has(session.id) ? (
                      <p className="text-sm text-ink-3 py-4 m-0">Loading bidders…</p>
                    ) : participants[session.id]?.length > 0 ? (
                      <div className="flex flex-col">
                        <div className="flex items-baseline justify-between pb-2 border-b border-hairline">
                          <span className="label">Name and number</span>
                          <span className="label">Pledged</span>
                        </div>
                        {participants[session.id].map((participant) => (
                          <div
                            key={participant.id}
                            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3 border-b border-hairline"
                          >
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-[0.9rem] text-ink truncate">
                                {participant.display_name}
                              </span>
                              <span className="num text-xs text-ink-3">
                                {participant.mobile_number}
                              </span>
                            </div>

                            <span className="num text-[0.9rem] text-ink">
                              ${Number(participant.amount || 0).toLocaleString()}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => navigator.clipboard.writeText(participant.mobile_number)}
                                title="Copy mobile number"
                                aria-label={`Copy ${participant.display_name}'s mobile number`}
                                className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-cloud transition-colors duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24" aria-hidden="true">
                                  <rect x="9" y="9" width="11" height="11" rx="2" />
                                  <path d="M5 15V5a2 2 0 0 1 2-2h8" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteParticipant(participant.id, session.id, participant.display_name)}
                                title="Remove this bidder"
                                aria-label={`Remove ${participant.display_name}`}
                                className="p-1.5 rounded text-ink-3 hover:text-danger hover:bg-danger-bg transition-colors duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-ink-3 py-4 m-0">Nobody has joined this session yet.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
