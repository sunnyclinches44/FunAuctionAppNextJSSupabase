import { create } from 'zustand'

export type Bid = { name: string; delta: number }

type State = {
  participants: Map<string, number>
  history: Bid[]
  defaultCustom: number
}

type Actions = {
  addParticipant: (name: string) => boolean
  addBid: (name: string, amount: number) => boolean
  undo: () => void
  reset: () => void
  total: () => number
}

function cloneMap<T>(m: Map<string, T>) { return new Map(m) }

export const useAuctionStore = create<State & Actions>((set, get) => ({
  participants: new Map(),
  history: [],
  defaultCustom: 5,

  addParticipant: (name: string) => {
    const n = (name || '').trim()
    if (!n) return false
    const { participants } = get()
    if (participants.has(n)) return false
    const next = cloneMap(participants)
    next.set(n, 0)
    set({ participants: next })
    return true
  },

  addBid: (name: string, amount: number) => {
    const { participants, history } = get()
    if (!participants.has(name)) return false
    if (!(Number(amount) >= 5)) return false
    const next = cloneMap(participants)
    next.set(name, (next.get(name) || 0) + Number(amount))
    set({ participants: next, history: [...history, { name, delta: Number(amount) }] })
    return true
  },

  undo: () => {
    const { history, participants } = get()
    const last = history.at(-1)
    if (!last) return
    const next = cloneMap(participants)
    next.set(last.name, Math.max(0, (next.get(last.name) || 0) - last.delta))
    set({ participants: next, history: history.slice(0, -1) })
  },

  reset: () => set({ participants: new Map(), history: [], defaultCustom: 5 }),

  total: () => Array.from(get().participants.values()).reduce((a, b) => a + b, 0),
}))
