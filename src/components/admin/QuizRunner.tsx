'use client'

import { formatSeconds, scoreLine, type AdminQuizResults } from '@/lib/quiz'

interface QuizRunnerProps {
  results: AdminQuizResults
  busy: boolean
  onRelease: (questionId: string) => Promise<void>
  onReveal: () => Promise<void>
  onHide: () => Promise<void>
  onFinish: () => Promise<void>
  onReset: () => Promise<void>
}

/**
 * The organiser's control strip during the event: what the phones are seeing
 * right now, and the one or two buttons that move it on.
 */
export default function QuizRunner({
  results,
  busy,
  onRelease,
  onReveal,
  onHide,
  onFinish,
  onReset
}: QuizRunnerProps) {
  const { phase, questions, active_question_id } = results
  const active = questions.find(q => q.id === active_question_id) ?? null
  const nextDraft = questions.find(q => q.status === 'draft') ?? null
  const revealedCount = questions.filter(q => q.status === 'revealed').length
  const answeredAny = questions.some(q => q.answered_count > 0)

  let headline: string
  let detail: string

  switch (phase) {
    case 'question_open':
      headline = active ? `Question ${active.number} is on every phone` : 'A question is live'
      detail = active
        ? `${active.answered_count} of ${results.participant_count} have answered.`
        : ''
      break
    case 'question_revealed':
      headline = active ? `Question ${active.number} revealed` : 'Answer revealed'
      detail = active
        ? `${scoreLine(active.correct_count, active.answered_count)} got it right.`
        : ''
      break
    case 'finished':
      headline = 'Quiz finished'
      detail = 'Every phone shows its own score. The leaderboard here is yours alone.'
      break
    default:
      headline = questions.length === 0 ? 'Write some questions to start' : 'Nothing on the phones'
      detail = questions.length === 0
        ? ''
        : revealedCount === 0
          ? `${questions.length} ready. Bidding carries on until you release one.`
          : `${revealedCount} of ${questions.length} asked so far.`
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label">Run the quiz</span>
        {phase === 'question_open' && (
          <span className="pill pill-live">
            <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
            Live on phones
          </span>
        )}
        {phase === 'finished' && <span className="pill pill-quiet">Finished</span>}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="display text-lg">{headline}</span>
        {detail && <span className="text-sm text-ink-3">{detail}</span>}
      </div>

      {phase === 'question_revealed' && active && (
        <div className="flex flex-col gap-1.5 pt-3 border-t border-hairline">
          <span className="label">Fastest finger</span>
          {active.answers.filter(a => a.is_correct).length === 0 ? (
            <p className="text-sm text-ink-3 m-0">Nobody had it.</p>
          ) : (
            <ol className="flex flex-col list-none p-0 m-0">
              {active.answers.filter(a => a.is_correct).slice(0, 3).map((a, i) => (
                <li key={a.participant_id} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 py-1.5">
                  <span className={`num text-sm ${i === 0 ? 'text-accent' : 'text-ink-3'}`}>{i + 1}</span>
                  <span className={`text-[0.9rem] truncate ${i === 0 ? 'text-ink font-medium' : 'text-ink'}`}>{a.display_name}</span>
                  <span className={`num text-sm ${i === 0 ? 'text-accent' : 'text-ink-3'}`}>{formatSeconds(a.seconds)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {phase === 'question_open' && (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onReveal}>
            {busy ? '…' : 'Reveal the answer'}
          </button>
        )}

        {phase !== 'question_open' && nextDraft && (
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onRelease(nextDraft.id)}>
            {busy ? '…' : `Release question ${nextDraft.number}`}
          </button>
        )}

        {phase !== 'question_open' && phase !== 'finished' && !nextDraft && questions.length > 0 && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => {
              if (confirm('Finish the quiz? Every phone will see its own final score.')) onFinish()
            }}
          >
            Finish the quiz
          </button>
        )}

        {(phase === 'question_revealed' || phase === 'finished') && (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onHide}>
            Take it off the phones
          </button>
        )}

        {phase === 'question_revealed' && nextDraft && (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => {
              if (confirm('Finish the quiz now, with questions still unasked?')) onFinish()
            }}
          >
            Finish early
          </button>
        )}

        {(answeredAny || revealedCount > 0 || phase !== 'idle') && (
          <button
            type="button"
            className="btn btn-quiet ml-auto"
            disabled={busy}
            onClick={() => {
              if (confirm('Reset the quiz? Every answer is wiped and every question goes back to unasked.')) onReset()
            }}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
