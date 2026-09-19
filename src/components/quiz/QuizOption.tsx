import { memo } from 'react'
import { QUIZ_OPTION_LABELS } from '@/lib/quiz'

export type OptionTone = 'plain' | 'picked' | 'correct' | 'wrong' | 'muted'

interface QuizOptionProps {
  index: number
  text: string
  tone?: OptionTone
  disabled?: boolean
  onSelect?: (index: number) => void
  /** Small trailing note, e.g. "Your pick" or "12 picked this". */
  note?: string
}

const toneClass: Record<OptionTone, string> = {
  plain: '',
  picked: 'option-picked',
  correct: 'option-correct',
  wrong: 'option-wrong',
  muted: 'option-muted'
}

/**
 * One of the four answers. Used on the phone pop-up and on the organiser's
 * page, so the same option looks the same everywhere.
 */
const QuizOption = memo(function QuizOption({
  index,
  text,
  tone = 'plain',
  disabled = false,
  onSelect,
  note
}: QuizOptionProps) {
  const letter = QUIZ_OPTION_LABELS[index] ?? String(index + 1)
  const interactive = Boolean(onSelect) && !disabled

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={() => onSelect?.(index)}
      className={`option ${toneClass[tone]} ${interactive ? '' : 'option-static'}`}
      aria-pressed={tone === 'picked' ? true : undefined}
    >
      <span className="option-letter num" aria-hidden="true">{letter}</span>
      <span className="min-w-0 flex flex-col gap-0.5">
        <span className="leading-snug">{text}</span>
        {note && <span className="text-xs text-ink-3">{note}</span>}
      </span>
    </button>
  )
})

export default QuizOption
