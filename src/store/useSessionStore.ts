import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { supabase } from '@/lib/supabaseClient'

export interface Session {
  id: string
  code: string
  title: string
}

export interface Participant {
  id: string
  session_id: string
  user_id: string | null
  device_id: string | null
  display_name: string
  mobile_number: string
  amount: number
  created_at: string
}

export interface Bid {
  id: string
  session_id: string
  participant_id: string
  delta: number
  created_at: string
}

interface SessionState {
  // Session data
  currentSession: Session | null
  participants: Participant[]
  bids: Bid[]
  
  // UI state
  isLoading: boolean
  error: string | null
  rtReady: boolean
  
  // Computed values
  totalAmount: number
  participantCount: number
  
  // Actions
  setSession: (session: Session | null) => void
  setParticipants: (participants: Participant[]) => void
  addParticipant: (participant: Participant) => void
  updateParticipant: (participant: Participant) => void
  removeParticipant: (participantId: string) => void
  addBid: (bid: Bid) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setRtReady: (ready: boolean) => void
  reset: () => void
  
  // Async actions
  loadSession: (sessionCode: string) => Promise<void>
  joinSession: (sessionCode: string, displayName: string, deviceId: string, mobileNumber: string) => Promise<boolean>
  placeBid: (sessionCode: string, deviceId: string, amount: number) => Promise<boolean>
}

const initialState = {
  currentSession: null,
  participants: [],
  bids: [],
  isLoading: false,
  error: null,
  rtReady: false,
  totalAmount: 0,
  participantCount: 0
}

export const useSessionStore = create<SessionState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      
      // Basic setters
      setSession: (session) => set({ currentSession: session }),
      setParticipants: (participants) => set({ 
        participants,
        participantCount: participants.length,
        totalAmount: participants.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      }),
      addParticipant: (participant) => set((state) => ({
        participants: [...state.participants, participant],
        participantCount: state.participants.length + 1,
        totalAmount: state.totalAmount + Number(participant.amount || 0)
      })),
      updateParticipant: (participant) => set((state) => {
        const oldAmount = state.participants.find(p => p.id === participant.id)?.amount || 0
        const newAmount = Number(participant.amount || 0)
        const amountDiff = newAmount - oldAmount
        
        return {
          participants: state.participants.map(p => 
            p.id === participant.id ? participant : p
          ),
          totalAmount: state.totalAmount + amountDiff
        }
      }),
      removeParticipant: (participantId) => set((state) => {
        const participant = state.participants.find(p => p.id === participantId)
        const amount = participant ? Number(participant.amount || 0) : 0
        
        return {
          participants: state.participants.filter(p => p.id !== participantId),
          participantCount: state.participants.length - 1,
          totalAmount: state.totalAmount - amount
        }
      }),
      addBid: (bid) => set((state) => ({ bids: [bid, ...state.bids] })),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setRtReady: (ready) => set({ rtReady: ready }),
      reset: () => set(initialState),
      
      // Async actions
      loadSession: async (sessionCode) => {
        if (!sessionCode || typeof sessionCode !== 'string') {
          set({ 
            error: 'Invalid session code provided',
            isLoading: false 
          })
          return
        }

        set({ isLoading: true, error: null })
        
        try {
          console.log('Store: Loading session with code:', sessionCode)
          
          const { data, error } = await supabase.rpc('get_session_details', {
            p_session_code: sessionCode
          })
          
          if (error) {
            console.error('Store: RPC error:', error)
            throw error
          }
          
          if (data) {
            console.log('Store: Session data received:', data)
            set({
              currentSession: {
                id: data.session.id,
                code: data.session.code,
                title: data.session.title
              },
              participants: data.participants || [],
              participantCount: data.participant_count || 0,
              totalAmount: data.total_amount || 0
            })
          } else {
            set({ 
              error: 'No session data received',
              isLoading: false 
            })
          }
        } catch (error) {
          console.error('Store: Error loading session:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load session' 
          })
        } finally {
          set({ isLoading: false })
        }
      },
      
      joinSession: async (sessionCode, displayName, deviceId, mobileNumber) => {
        try {
          const { error } = await supabase.rpc('join_session', {
            p_session_code: sessionCode,
            p_display_name: displayName,
            p_device_id: deviceId,
            p_mobile_number: mobileNumber
          })
          
          if (error) throw error
          return true
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to join session' 
          })
          return false
        }
      },
      
      placeBid: async (sessionCode, deviceId, amount) => {
        try {
          const { error } = await supabase.rpc('place_bid', {
            p_session_code: sessionCode,
            p_device_id: deviceId,
            p_amount: amount
          })
          
          if (error) throw error
          return true
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to place bid' 
          })
          return false
        }
      }
    })),
    {
      name: 'session-store'
    }
  )
)

// Selectors for better performance
export const useSessionSelector = <T>(selector: (state: SessionState) => T) => 
  useSessionStore(selector)

export const useCurrentSession = () => useSessionSelector(state => state.currentSession)
export const useParticipants = () => useSessionSelector(state => state.participants)
export const useTotalAmount = () => useSessionSelector(state => state.totalAmount)
export const useIsLoading = () => useSessionSelector(state => state.isLoading)
export const useError = () => useSessionSelector(state => state.error)
export const useRtReady = () => useSessionSelector(state => state.rtReady)
