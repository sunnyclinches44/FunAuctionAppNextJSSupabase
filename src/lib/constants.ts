export const AUCTION_CONFIG = {
  MIN_BID_AMOUNT: 5,
  MAX_BID_AMOUNT: 10000,
  DEVICE_ID_KEY: 'laddu_device_id',
  DISPLAY_NAME_KEY: 'laddu_display_name',
  THEME_KEY: 'laddu_theme'
} as const

export const STORAGE_KEYS = {
  DEVICE_ID: AUCTION_CONFIG.DEVICE_ID_KEY,
  DISPLAY_NAME: AUCTION_CONFIG.DISPLAY_NAME_KEY,
  THEME: AUCTION_CONFIG.THEME_KEY
} as const

/**
 * The bidding ladder. Each round unlocks new amounts and keeps everything
 * earlier rounds unlocked, so nobody is pushed past what they wanted to give.
 *
 * Mirrored in SQL by amount_allowed_in_round() in rounds_migration.sql, which is
 * what actually enforces it. Change one, change the other.
 */
export const ROUNDS = [
  {
    n: 1,
    name: 'Warm-up',
    blurb: 'Small stakes, everyone in.',
    unlocks: [5, 10] as readonly number[],
    custom: false
  },
  {
    n: 2,
    name: 'Stakes up',
    blurb: 'The bigger buttons arrive.',
    unlocks: [20, 50] as readonly number[],
    custom: false
  },
  {
    n: 3,
    name: 'Open',
    blurb: 'Name any amount you like.',
    unlocks: [] as readonly number[],
    custom: true
  }
] as const

export const FIRST_ROUND = 1
export const FINAL_ROUND = ROUNDS.length

export type RoundNumber = 1 | 2 | 3

/** Every preset amount across all rounds, in ladder order. */
export const ALL_PRESET_AMOUNTS: readonly number[] = ROUNDS.flatMap(r => [...r.unlocks])

/** Clamp anything coming from the database or a URL into a real round number. */
export function normalizeRound(round: unknown): RoundNumber {
  const n = Number(round)
  if (!Number.isFinite(n)) return FIRST_ROUND
  return Math.min(FINAL_ROUND, Math.max(FIRST_ROUND, Math.round(n))) as RoundNumber
}

/** Preset amounts a bidder can press in this round, cumulative across rounds. */
export function amountsForRound(round: number): readonly number[] {
  const current = normalizeRound(round)
  return ROUNDS.filter(r => r.n <= current).flatMap(r => [...r.unlocks])
}

/** True once the free-text amount is available. */
export function customAllowed(round: number): boolean {
  const current = normalizeRound(round)
  return ROUNDS.some(r => r.n <= current && r.custom)
}

/** The round that first makes this amount available, for the locked-button hint. */
export function roundThatUnlocks(amount: number): RoundNumber {
  const owner = ROUNDS.find(r => r.unlocks.includes(amount))
  return (owner?.n ?? FINAL_ROUND) as RoundNumber
}

export function roundMeta(round: number) {
  return ROUNDS[normalizeRound(round) - 1]
}
