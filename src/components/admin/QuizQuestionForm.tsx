'use client'

import { useState } from 'react'
import { QUIZ_OPTION_COUNT, QUIZ_OPTION_LABELS } from '@/lib/quiz'

export interface QuizQuestionInput {
  prompt: string
  options: string[]
  correct_index: number
}

interface QuizQuestionFormProps {
  initial?: QuizQuestionInput
  submitLabel: string
  busy?: boolean
  onSubmit: (values: QuizQuestionInput) => Promise<boolean>
  onCancel?: () => void
}

const blank: QuizQuestionInput = {
  prompt: '',
  options: Array.from({ length: QUIZ_OPTION_COUNT }, () => ''),
  correct_index: -1
}

/**
 * Write or edit one question: the prompt, four options, and which one is
 * right. The correct option is picked with the radio beside it, so the
 * organiser marks the answer in the same place they typed it.
 */
export default function QuizQuestionForm({
  initial,
  submitLabel,
  busy = false,
  onSubmit,
  onCancel
}: QuizQuestionFormProps) {
  const [values, setValues] = useState<QuizQuestionInput>(initial ?? blank)
  const [touched, setTouched] = useState(false)

  const trimmedPrompt = values.prompt.trim()
  const trimmedOptions = values.options.map(o => o.trim())
  const missingOption = trimmedOptions.findIndex(o => o === '')
  const valid =
    trimmedPrompt !== '' &&
    missingOption === -1 &&
    values.correct_index >= 0 &&
    values.correct_index < QUIZ_OPTION_COUNT

  const setOption = (i: number, text: string) =>
    setValues(v => ({ ...v, options: v.options.map((o, j) => (j === i ? text : o)) }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!valid || busy) return
    const ok = await onSubmit({
      prompt: trimmedPrompt,
      options: trimmedOptions,
      correct_index: values.correct_index
    })
    if (ok && !initial) {
      setValues(blank)
      setTouched(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="quiz-prompt" className="label">Question</label>
        <textarea
          id="quiz-prompt"
          value={values.prompt}
          onChange={(e) => setValues(v => ({ ...v, prompt: e.target.value }))}
          rows={2}
          placeholder="Which year was the temple founded?"
          className={`field resize-y ${touched && trimmedPrompt === '' ? 'field-bad' : ''}`}
        />
      </div>

      <fieldset className="flex flex-col gap-2 border-0 p-0 m-0 min-w-0">
        <legend className="label mb-1.5">Four options. Tick the right one.</legend>
        {values.options.map((text, i) => {
          const isCorrect = values.correct_index === i
          return (
            <div
              key={i}
              className={`grid grid-cols-[2rem_1fr_auto] items-center gap-2 p-2 rounded border ${
                isCorrect ? 'border-live bg-live-bg' : 'border-hairline'
              }`}
            >
              <span className={`num text-sm text-center ${isCorrect ? 'text-live' : 'text-ink-3'}`}>
                {QUIZ_OPTION_LABELS[i]}
              </span>
              <input
                type="text"
                value={text}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${QUIZ_OPTION_LABELS[i]}`}
                aria-label={`Option ${QUIZ_OPTION_LABELS[i]}`}
                className={`field py-2 ${touched && text.trim() === '' ? 'field-bad' : ''}`}
              />
              <label
                className={`flex items-center gap-1.5 text-xs cursor-pointer select-none px-1 ${
                  isCorrect ? 'text-live font-medium' : 'text-ink-3'
                }`}
              >
                <input
                  type="radio"
                  name="quiz-correct"
                  checked={isCorrect}
                  onChange={() => setValues(v => ({ ...v, correct_index: i }))}
                  className="accent-[var(--live)]"
                />
                {isCorrect ? 'Correct' : 'Mark correct'}
              </label>
            </div>
          )
        })}
        {touched && values.correct_index < 0 && (
          <p className="text-sm text-danger m-0">Tick which option is the right answer.</p>
        )}
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy || (touched && !valid)}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
