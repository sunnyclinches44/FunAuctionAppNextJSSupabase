'use client'

import { useEffect, useState } from 'react'
import QuizOption, { type OptionTone } from './QuizOption'
import {
  formatSeconds,
  scoreLine,
  QUIZ_OPTION_LABELS,
  type QuizPhase,
  type QuizState
} from '@/lib/quiz'

interface QuizModalProps {
  state: QuizState
  phase: QuizPhase
  /** False while the state for the live pointer is still on its way. */
  synced: boolean
  hasJoined: boolean
  isSubmitting: boolean
  error: string | null
  onAnswer: (choice: number) => void
  onDismiss: () => void
}

/**
 * The pop-up that sits over the auction when the organiser releases a
 * question, reveals its answer, or finishes the quiz. The auction stays
 * mounted underneath, so nothing about bidding is lost.
 *
 * What this shows is deliberately narrow: the question, this person's own
 * pick, the answer once revealed, the fastest correct names, and this
 * person's own score. Never anyone else's answers or score.
 */
export default function QuizModal({
  state,
  phase,
  synced,
  hasJoined,
  isSubmitting,
  error,
  onAnswer,
  onDismiss
}: QuizModalProps) {
  // Escape closes; the sidebar card brings it back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  // Keep the page behind from scrolling under the pop-up.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const question = state.question
  const total = state.my_score.total || state.question_count
  const openedAt = question?.status === 'open' ? question.opened_at : null
  const elapsed = useElapsedSeconds(openedAt)

  let body: React.ReactNode
  let eyebrow = 'Quiz'
  let pill: React.ReactNode = null

  if (!synced || (phase !== 'finished' && !question)) {
    body = <p className="text-sm text-ink-3 m-0 py-6 text-center">Loading the question…</p>
  } else if (phase === 'finished') {
    eyebrow = 'Quiz over'
    pill = <span className="pill pill-quiet">Only you can see this</span>
    const { correct } = state.my_score
    // Out of the questions actually asked. If the organiser finished early,
    // the unasked ones do not count against anyone.
    const asked = state.my_score.revealed || total
    body = (
      <div className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-3 pb-4 border-b-2 border-ink">
          <div className="flex flex-col gap-1">
            <span className="label">Your score</span>
            <span className="display text-4xl num leading-none">{scoreLine(correct, asked)}</span>
          </div>
          <span className="text-sm text-ink-3 text-right leading-snug">
            {correct === asked && asked > 0
              ? 'Every one right.'
              : correct === 0
                ? 'Better luck next time.'
                : `${asked - correct} to look up later.`}
          </span>
        </div>

        {state.my_results.length > 0 ? (
          <ol className="flex flex-col list-none p-0 m-0">
            {state.my_results.map((r) => {
              const mine = r.my_choice
              return (
                <li
                  key={r.id}
                  className="grid grid-cols-[1.5rem_1fr_auto] items-start gap-3 py-3 border-b border-hairline last:border-b-0"
                >
                  <span className="num text-sm text-ink-3 pt-0.5">{r.number}</span>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[0.9rem] text-ink leading-snug">{r.prompt}</span>
                    <span className="text-xs text-ink-3">
                      Answer: <span className="text-ink">{QUIZ_OPTION_LABELS[r.correct_index]} · {r.options[r.correct_index]}</span>
                      {mine != null && !r.is_correct && (
                        <>
                          {' · '}You picked {QUIZ_OPTION_LABELS[mine]}
                        </>
                      )}
                      {mine == null && ' · You did not answer'}
                    </span>
                  </div>
                  <span
                    className={`pill ${r.is_correct ? 'pill-live' : 'pill-idle'}`}
                    aria-label={r.is_correct ? 'Correct' : 'Wrong'}
                  >
                    {r.is_correct ? 'Right' : 'Wrong'}
                  </span>
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="text-sm text-ink-3 m-0">No questions were revealed.</p>
        )}

        <button type="button" onClick={onDismiss} className="btn btn-primary self-start">
          Back to the auction
        </button>
      </div>
    )
  } else if (question) {
    const revealed = question.status === 'revealed' && question.correct_index != null
    const mine = question.my_choice
    eyebrow = `Question ${question.number} of ${total}`
    pill = revealed
      ? <span className="pill pill-accent">Answer</span>
      : <span className="pill pill-live"><span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />Live</span>

    const toneFor = (i: number): OptionTone => {
      if (revealed) {
        if (i === question.correct_index) return 'correct'
        if (i === mine) return 'wrong'
        return 'muted'
      }
      if (mine != null) return i === mine ? 'picked' : 'muted'
      return 'plain'
    }

    const noteFor = (i: number): string | undefined => {
      if (i === mine) return revealed && i === question.correct_index ? 'Your pick. Right.' : 'Your pick'
      return undefined
    }

    const canAnswer = !revealed && hasJoined && mine == null && !isSubmitting

    body = (
      <div className="flex flex-col gap-5">
        <h2 className="text-xl sm:text-2xl m-0">{question.prompt}</h2>

        <div className="grid gap-2">
          {question.options.map((text, i) => (
            <QuizOption
              key={i}
              index={i}
              text={text}
              tone={toneFor(i)}
              note={noteFor(i)}
              disabled={!canAnswer}
              onSelect={canAnswer ? onAnswer : undefined}
            />
          ))}
        </div>

        {error && <p className="text-sm text-danger m-0">{error}</p>}

        {!revealed && (
          <div className="flex flex-col gap-1.5">
            {!hasJoined ? (
              <p className="text-sm text-ink-2 m-0">
                Join the auction with your name to answer. Close this and join below.
              </p>
            ) : mine != null ? (
              <p className="text-sm text-ink-2 m-0">
                Locked in. The answer comes when the organiser reveals it.
              </p>
            ) : (
              <p className="text-sm text-ink-2 m-0">
                Tap one. First tap counts, so no changing your mind.
              </p>
            )}
            <p className="text-xs text-ink-3 m-0 num flex items-center gap-2">
              <span>{question.answered_count} answered so far</span>
              {elapsed != null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>open for {elapsed}s</span>
                </>
              )}
            </p>
          </div>
        )}

        {revealed && (
          <div className="flex flex-col gap-4 pt-4 border-t border-hairline">
            <div className="flex items-baseline justify-between gap-3">
              <span className="display text-base">
                {mine == null
                  ? 'You did not answer'
                  : mine === question.correct_index
                    ? 'You got it'
                    : 'Not this time'}
              </span>
              <span className="text-xs text-ink-3 num">
                {question.correct_count ?? 0} of {question.answered_count} got it right
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="label">Fastest finger</span>
              {question.fastest.length === 0 ? (
                <p className="text-sm text-ink-3 m-0">Nobody had it this time.</p>
              ) : (
                <ol className="flex flex-col list-none p-0 m-0">
                  {question.fastest.map((f, i) => (
                    <li
                      key={`${f.display_name}-${i}`}
                      className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 py-2 border-b border-hairline last:border-b-0"
                    >
                      <span className={`num text-sm ${i === 0 ? 'text-accent' : 'text-ink-3'}`}>{i + 1}</span>
                      <span className={`text-[0.9rem] truncate ${i === 0 ? 'text-ink font-medium' : 'text-ink'}`}>
                        {f.display_name}
                      </span>
                      <span className={`num text-sm ${i === 0 ? 'text-accent' : 'text-ink-3'}`}>
                        {formatSeconds(f.seconds)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-ink-3">
                Your score so far:{' '}
                <span className="num text-ink">{scoreLine(state.my_score.correct, state.my_score.revealed)}</span>
              </span>
              <button type="button" onClick={onDismiss} className="btn btn-primary">
                Back to the auction
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onDismiss} role="presentation">
      <div
        className="modal animate-rise"
        role="dialog"
        aria-modal="true"
        aria-label={eyebrow}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-hairline">
          <span className="label">{eyebrow}</span>
          <div className="flex items-center gap-2">
            {pill}
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close"
              className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-cloud transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-5">{body}</div>
      </div>
    </div>
  )
}

/** Whole seconds since an ISO timestamp, ticking once a second. Null when no timestamp. */
function useElapsedSeconds(since: string | null): number | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!since) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [since])

  if (!since) return null
  const start = Date.parse(since)
  if (!Number.isFinite(start)) return null
  return Math.max(0, Math.floor((now - start) / 1000))
}
