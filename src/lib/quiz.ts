/**
 * The live quiz that runs inside an auction session.
 *
 * The shapes here mirror what the SQL functions in quiz_migration.sql return.
 * The phone side (get_quiz_state) never carries the correct option until the
 * organiser has revealed the question, so `correct_index` is nullable on
 * purpose. Change the SQL, change this.
 */

export type QuizPhase = 'idle' | 'question_open' | 'question_revealed' | 'finished'

export type QuestionStatus = 'draft' | 'open' | 'revealed'

export const QUIZ_OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

export const QUIZ_OPTION_COUNT = QUIZ_OPTION_LABELS.length

/**
 * How many fastest correct answers the reveal names. Matches LIMIT 1 in SQL.
 *
 * One, on purpose: the reveal names the winner and nobody else. A longer
 * list put other people's results on every phone and, in a room of fifty,
 * needed its own scrollbar. The UI slices to this as well, so a database
 * still running the older function shows the winner all the same.
 */
export const FASTEST_SHOWN = 1

export function normalizeQuizPhase(phase: unknown): QuizPhase {
  switch (phase) {
    case 'question_open':
    case 'question_revealed':
    case 'finished':
      return phase
    default:
      return 'idle'
  }
}

// ---------- What a phone sees ----------

export interface FastestAnswer {
  display_name: string
  seconds: number
}

export interface LiveQuestion {
  id: string
  number: number
  prompt: string
  options: string[]
  status: QuestionStatus
  opened_at: string | null
  revealed_at: string | null
  answered_count: number
  /** Only present once revealed. */
  correct_count: number | null
  /** This person's own pick, or null if they have not answered. */
  my_choice: number | null
  /** The answer key. Null until the organiser reveals. */
  correct_index: number | null
  fastest: FastestAnswer[]
}

export interface MyResult {
  id: string
  number: number
  prompt: string
  options: string[]
  correct_index: number
  my_choice: number | null
  is_correct: boolean
}

export interface MyScore {
  correct: number
  answered: number
  /** Questions revealed so far. */
  revealed: number
  /** Questions written for this session. */
  total: number
}

export interface QuizState {
  phase: QuizPhase
  question_count: number
  joined: boolean
  question: LiveQuestion | null
  my_score: MyScore
  my_results: MyResult[]
}

export const EMPTY_QUIZ_STATE: QuizState = {
  phase: 'idle',
  question_count: 0,
  joined: false,
  question: null,
  my_score: { correct: 0, answered: 0, revealed: 0, total: 0 },
  my_results: []
}

// ---------- What the organiser sees ----------

export interface QuizQuestionRow {
  id: string
  session_id: string
  position: number
  prompt: string
  options: string[]
  correct_index: number
  status: QuestionStatus
  opened_at: string | null
  revealed_at: string | null
  created_at: string
}

export interface AdminAnswer {
  participant_id: string
  display_name: string
  choice_index: number
  is_correct: boolean
  seconds: number
}

export interface AdminQuestion {
  id: string
  number: number
  prompt: string
  options: string[]
  correct_index: number
  status: QuestionStatus
  opened_at: string | null
  revealed_at: string | null
  answered_count: number
  correct_count: number
  answers: AdminAnswer[]
}

export interface AdminLeaderboardRow {
  participant_id: string
  display_name: string
  correct: number
  answered: number
  fastest_wins: number
  total_seconds: number
}

export interface AdminQuizResults {
  phase: QuizPhase
  active_question_id: string | null
  question_count: number
  participant_count: number
  questions: AdminQuestion[]
  leaderboard: AdminLeaderboardRow[]
}

export type QuizAction = 'open' | 'reveal' | 'hide' | 'finish' | 'reset'

/** "2.4s" for the fastest-finger list. */
export function formatSeconds(seconds: number): string {
  const n = Number(seconds)
  if (!Number.isFinite(n) || n < 0) return '0.0s'
  return `${n.toFixed(1)}s`
}

/** "3 of 10" style score line. */
export function scoreLine(correct: number, outOf: number): string {
  return `${correct} of ${outOf}`
}
