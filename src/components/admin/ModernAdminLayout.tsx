'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Session {
  id: string
  code: string
  title: string
  created_at: string
  participant_count: number
  total_amount: number
}

interface Participant {
  id: string
  display_name: string
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
}

export default function ModernAdminLayout({
  sessions,
  onDelete,
  onDeleteParticipant,
  onLoadParticipants,
  onCreateSession
}: ModernAdminLayoutProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({})
  const [loadingParticipants, setLoadingParticipants] = useState<Set<string>>(new Set())

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This will permanently remove all session data, participants, and bids.')) {
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
    if (!confirm(`Are you sure you want to delete participant "${participantName}"? This will remove all their bids.`)) {
      return
    }

    try {
      onDeleteParticipant(participantId, sessionId)
      // Refresh participants list
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
      // Load participants if not already loaded
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-amber-400/10 to-orange-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-blue-400/10 to-cyan-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-400/5 to-emerald-500/5 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl text-amber-300 mb-6">
            <span className="text-lg">⚙️</span>
            <span className="font-medium">Admin Panel</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-200 mb-4">
            Manage Your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              Auction Sessions
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto">
            Create, monitor, and manage all your auction sessions from one central location
          </p>
        </div>

        {/* Create Session Button */}
        <div className="text-center mb-12 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
          <button
            onClick={onCreateSession}
            className="group relative px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg rounded-2xl shadow-2xl hover:shadow-amber-500/25 transition-all duration-300 hover:scale-105 hover:-translate-y-1"
          >
            <span className="relative z-10 flex items-center space-x-2">
              <span>✨</span>
              <span>Create New Session</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>

        {/* Sessions List */}
        <div className="space-y-6 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          {sessions.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No Sessions Found</h3>
              <p className="text-slate-400">Create your first auction session to get started!</p>
            </div>
          ) : (
            sessions.map((session, index) => (
              <div
                key={session.id}
                className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-300"
                style={{animationDelay: `${0.3 + index * 0.1}s`}}
              >
                {/* Session Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-xl font-bold text-white">
                      {session.code.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-200">{session.title}</h3>
                      <p className="text-slate-400 text-sm">Code: {session.code}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-amber-400">${session.total_amount}</div>
                      <div className="text-sm text-slate-400">{session.participant_count} participants</div>
                    </div>
                    
                    <button
                      onClick={() => toggleSessionExpansion(session.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                    >
                      <svg 
                        className={`w-6 h-6 transition-transform duration-200 ${expandedSessions.has(session.id) ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Session Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white/5 rounded-2xl p-4 text-center">
                    <div className="text-2xl mb-2">👥</div>
                    <div className="text-lg font-semibold text-slate-200">{session.participant_count}</div>
                    <div className="text-sm text-slate-400">Participants</div>
                  </div>
                  
                  <div className="bg-white/5 rounded-2xl p-4 text-center">
                    <div className="text-2xl mb-2">💰</div>
                    <div className="text-lg font-semibold text-slate-200">${session.total_amount}</div>
                    <div className="text-sm text-slate-400">Total Amount</div>
                  </div>
                  
                  <div className="bg-white/5 rounded-2xl p-4 text-center">
                    <div className="text-2xl mb-2">📅</div>
                    <div className="text-lg font-semibold text-slate-200">
                      {new Date(session.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-slate-400">Created</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => router.push(`/s/${session.code}`)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:scale-105 transition-all duration-200"
                    >
                      👁️ View Session
                    </button>
                    
                    <button
                      onClick={() => router.push(`/join?code=${session.code}`)}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:scale-105 transition-all duration-200"
                    >
                      🚀 Join Session
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(session.id)}
                    disabled={deleting === session.id}
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium rounded-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting === session.id ? '🗑️ Deleting...' : '🗑️ Delete Session'}
                  </button>
                </div>

                {/* Expanded Participants Section */}
                {expandedSessions.has(session.id) && (
                  <div className="mt-6 pt-6 border-t border-white/10 animate-fade-in-up">
                    <h4 className="text-lg font-semibold text-slate-200 mb-4 flex items-center space-x-2">
                      <span>👥</span>
                      <span>Participants</span>
                    </h4>
                    
                    {loadingParticipants.has(session.id) ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2"></div>
                        <p className="text-slate-400">Loading participants...</p>
                      </div>
                    ) : participants[session.id]?.length > 0 ? (
                      <div className="space-y-3">
                        {participants[session.id].map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
                                {participant.display_name.slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-slate-200">{participant.display_name}</div>
                                <div className="text-sm text-slate-400">ID: {participant.device_id.slice(0, 8)}...</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <div className="text-lg font-bold text-amber-400">${participant.amount}</div>
                                <div className="text-xs text-slate-400">
                                  {new Date(participant.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleDeleteParticipant(participant.id, session.id, participant.display_name)}
                                className="px-3 py-1 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 text-red-400 text-sm rounded-lg hover:bg-red-500/30 transition-all duration-200"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">👤</div>
                        <p className="text-slate-400">No participants yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
