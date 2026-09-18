import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  EMPTY_QUIZ_STATE,
  normalizeQuizPhase,
  type QuizPhase,
  type QuizState
} from '@/lib/quiz'

/** While a question is open, refresh the "N answered" count this often. */
const OPEN_POLL_MS = 5000

interface UseQuizArgs {
  sessionCode: string
  deviceId: string
  /** From the session store; updated over realtime when the organiser acts. */
  phase: QuizPhase
  activeQuestionId: string | null
  hasJoined: boolean
}

/**
 * The phone side of the quiz.
 *
 * The organiser's actions arrive as UPDATEs on the sessions row (phase and
 * active question). Every time that pointer moves, this refetches the quiz
 * state from get_quiz_state(), which is the only thing the phone ever learns.
 * The pop-up shows itself whenever the pointer moves to something worth
 * showing, and a dismissal only sticks until the pointer moves again.
 */
export function useQuiz({ sessionCode, deviceId, phase, activeQuestionId, hasJoined }: UseQuizArgs) {
  const [state, setState] = useState<QuizState>(EMPTY_QUIZ_STATE)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // What the person dismissed. Compared against the live pointer key, so a
  // new question or a reveal on the same question brings the pop-up back.
  const [dismissedKey, setDismissedKey] = useState<string | null>(null)
  // Which pointer the current `state` was fetched for. Until it matches the
  // live pointer, the pop-up shows a loading body rather than the old question.
  const [fetchedKey, setFetchedKey] = useState<string | null>(null)
  const inFlight = useRef(0)

  const pointerKey = `${phase}:${activeQuestionId ?? ''}`
  const pointerKeyRef = useRef(pointerKey)
  pointerKeyRef.current = pointerKey
  const ready = Boolean(sessionCode && deviceId)

  const refresh = useCallback(async () => {
    if (!ready) return
    const ticket = ++inFlight.current
    const forKey = pointerKeyRef.current
    setIsLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_quiz_state', {
        p_session_code: sessionCode,
        p_device_id: deviceId
      })
      if (error) throw error
      // Drop stale responses that overtook a newer request.
      if (ticket !== inFlight.current) return
      if (data) {
        setState({
          ...EMPTY_QUIZ_STATE,
          ...data,
          phase: normalizeQuizPhase(data.phase),
          my_results: Array.isArray(data.my_results) ? data.my_results : [],
          question: data.question
            ? { ...data.question, fastest: Array.isArray(data.question.fastest) ? data.question.fastest : [] }
            : null
        })
        setFetchedKey(forKey)
        setError(null)
      }
    } catch (err) {
      console.error('Quiz: failed to load state', err)
      setError(err instanceof Error ? err.message : 'Could not load the quiz')
    } finally {
      if (ticket === inFlight.current) setIsLoading(false)
    }
  }, [ready, sessionCode, deviceId])

  // Refetch whenever the organiser moves the pointer, or once this person
  // joins (their own answers become attributable).
  useEffect(() => {
    refresh()
  }, [refresh, pointerKey, hasJoined])

  // Keep the answered count moving while a question is open. Phones get no
  // realtime on answers (by design: nothing about other people reaches them),
  // so a light poll does it.
  useEffect(() => {
    if (phase !== 'question_open') return
    const id = setInterval(refresh, OPEN_POLL_MS)
    return () => clearInterval(id)
  }, [phase, refresh])

  const submitAnswer = useCallback(async (choice: number): Promise<boolean> => {
    const question = state.question
    if (!ready || !question || question.status !== 'open') return false
    if (question.my_choice != null) return false

    setIsSubmitting(true)
    // Show the pick straight away. The tap is the moment that counts.
    setState(prev => prev.question
      ? { ...prev, question: { ...prev.question, my_choice: choice } }
      : prev)

    try {
      const { error } = await supabase.rpc('submit_quiz_answer', {
        p_session_code: sessionCode,
        p_device_id: deviceId,
        p_question_id: question.id,
        p_choice: choice
      })
      if (error) throw error
      setError(null)
      refresh()
      return true
    } catch (err) {
      console.error('Quiz: failed to submit answer', err)
      setState(prev => prev.question
        ? { ...prev, question: { ...prev.question, my_choice: null } }
        : prev)
      setError(err instanceof Error ? err.message : 'Could not send your answer')
      // The database is the referee. If it says the question is closed or
      // already answered, pull the truth back down.
      refresh()
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [ready, state.question, sessionCode, deviceId, refresh])

  // Once the fetch for the live pointer lands, the database's view of the
  // phase wins (it also covers a question deleted under a live pointer).
  const synced = fetchedKey === pointerKey
  const effectivePhase: QuizPhase = synced ? state.phase : phase
  const showable = effectivePhase !== 'idle'
  const isOpen = showable && dismissedKey !== pointerKey

  const dismiss = useCallback(() => setDismissedKey(pointerKey), [pointerKey])
  const open = useCallback(() => setDismissedKey(null), [])

  return {
    state,
    phase: effectivePhase,
    synced,
    isLoading,
    isSubmitting,
    error,
    isOpen,
    showable,
    dismiss,
    open,
    submitAnswer,
    refresh
  }
}
