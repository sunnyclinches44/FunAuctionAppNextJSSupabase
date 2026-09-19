'use client'

import { useState } from 'react'
import QuizOption from '@/components/quiz/QuizOption'
import QuizQuestionForm, { type QuizQuestionInput } from './QuizQuestionForm'
import {
  formatSeconds,
  QUIZ_OPTION_LABELS,
  type AdminQuestion,
  type QuizPhase
} from '@/lib/quiz'

interface QuizQuestionListProps {
  questions: AdminQuestion[]
  phase: QuizPhase
  activeQuestionId: string | null
  busy: boolean
  onRelease: (questionId: string) => Promise<void>
  onReveal: () => Promise<void>
  onUpdate: (questionId: string, values: QuizQuestionInput) => Promise<boolean>
  onDelete: (questionId: string) => Promise<void>
}

function statusPill(q: AdminQuestion, isActive: boolean) {
  if (q.status === 'open' && isActive) {
    return (
      <span className="pill pill-live">
        <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
        Live
      </span>
    )
  }
  if (q.status === 'revealed') return <span className="pill pill-accent">Revealed</span>
  return <span className="pill pill-idle">Not asked</span>
}

/**
 * Every question for the session, in the order they will be asked. Each row
 * is where the organiser releases it, reveals it, edits it, or looks at who
 * answered what. This list is the run sheet.
 */
export default function QuizQuestionList({
  questions,
  phase,
  activeQuestionId,
  busy,
  onRelease,
  onReveal,
  onUpdate,
  onDelete
}: QuizQuestionListProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  if (questions.length === 0) {
    return (
      <p className="text-sm text-ink-3 py-6 text-center m-0">
        No questions yet. Write the first one below.
      </p>
    )
  }

  return (
    <ol className="flex flex-col gap-3 list-none p-0 m-0">
      {questions.map((q) => {
        const isActive = q.id === activeQuestionId
        const isLive = isActive && q.status === 'open' && phase === 'question_open'
        const isEditing = editing === q.id
        const isExpanded = expanded.has(q.id)
        const picks = q.options.map((_, i) => q.answers.filter(a => a.choice_index === i).length)

        return (
          <li
            key={q.id}
            className={`card p-4 flex flex-col gap-3 ${isLive ? 'border-accent' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-baseline gap-2.5 min-w-0">
                <span className="num text-sm text-ink-3 shrink-0">{q.number}</span>
                <span className="text-[0.95rem] text-ink leading-snug">{q.prompt}</span>
              </div>
              {statusPill(q, isActive)}
            </div>

            {isEditing ? (
              <QuizQuestionForm
                initial={{ prompt: q.prompt, options: q.options, correct_index: q.correct_index }}
                submitLabel="Save changes"
                busy={busy}
                onSubmit={async (values) => {
                  const ok = await onUpdate(q.id, values)
                  if (ok) setEditing(null)
                  return ok
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {q.options.map((text, i) => (
                    <QuizOption
                      key={i}
                      index={i}
                      text={text}
                      tone={i === q.correct_index ? 'correct' : 'plain'}
                      note={
                        q.status === 'revealed' || isLive
                          ? `${picks[i]} picked this`
                          : i === q.correct_index ? 'Correct answer' : undefined
                      }
                    />
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-2">
                    {isLive ? (
                      <button type="button" className="btn btn-primary" disabled={busy} onClick={onReveal}>
                        {busy ? '…' : 'Reveal the answer'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`btn ${q.status === 'draft' ? 'btn-primary' : 'btn-ghost'}`}
                        disabled={busy}
                        onClick={() => {
                          if (q.status === 'revealed' && !confirm(
                            'Ask this question again? Earlier answers to it are cleared.'
                          )) return
                          onRelease(q.id)
                        }}
                      >
                        {q.status === 'revealed' ? 'Ask again' : 'Release to phones'}
                      </button>
                    )}
                    {(q.status === 'revealed' || isLive) && (
                      <button type="button" className="btn btn-ghost" onClick={() => toggle(q.id)} aria-expanded={isExpanded}>
                        {isExpanded ? 'Hide answers' : `Answers (${q.answered_count})`}
                      </button>
                    )}
                  </div>

                  {!isLive && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="btn btn-quiet"
                        disabled={busy}
                        onClick={() => setEditing(q.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-quiet hover:!text-danger"
                        disabled={busy}
                        onClick={() => {
                          if (confirm('Delete this question? Any answers to it go too.')) onDelete(q.id)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {isLive && (
                  <p className="text-sm text-ink-3 m-0 num">
                    {q.answered_count} answered so far
                  </p>
                )}

                {isExpanded && (
                  <div className="pt-3 border-t border-hairline animate-rise flex flex-col gap-2">
                    <div className="flex items-baseline justify-between">
                      <span className="label">Who answered what</span>
                      <span className="label num">{q.correct_count} of {q.answered_count} right</span>
                    </div>
                    {q.answers.length === 0 ? (
                      <p className="text-sm text-ink-3 m-0 py-2">Nobody has answered.</p>
                    ) : (
                      <div className="flex flex-col">
                        {q.answers.map((a, i) => (
                          <div
                            key={a.participant_id}
                            className="grid grid-cols-[1.5rem_1fr_auto_auto] items-center gap-3 py-2 border-b border-hairline last:border-b-0"
                          >
                            <span className="num text-sm text-ink-3">{i + 1}</span>
                            <span className="text-[0.9rem] text-ink truncate">{a.display_name}</span>
                            <span className={`num text-sm ${a.is_correct ? 'text-live' : 'text-danger'}`}>
                              {QUIZ_OPTION_LABELS[a.choice_index]} · {a.is_correct ? 'right' : 'wrong'}
                            </span>
                            <span className="num text-sm text-ink-3">{formatSeconds(a.seconds)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </li>
        )
      })}
    </ol>
  )
}
