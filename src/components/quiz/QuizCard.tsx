import { memo } from 'react'
import { scoreLine, type QuizPhase, type QuizState } from '@/lib/quiz'

interface QuizCardProps {
  state: QuizState
  phase: QuizPhase
  onOpen: () => void
}

/**
 * The small quiz status card in the session sidebar. It is how someone who
 * closed the pop-up gets back to it, and it is the only trace of the quiz
 * on the page when nothing is live.
 */
const QuizCard = memo(function QuizCard({ state, phase, onOpen }: QuizCardProps) {
  const total = state.my_score.total || state.question_count

  // Nothing to say until the organiser has written questions.
  if (total === 0 && phase === 'idle') return null

  let headline: string
  let detail: string
  let action: string | null = null

  switch (phase) {
    case 'question_open':
      headline = state.question ? `Question ${state.question.number} is live` : 'A question is live'
      detail = state.question?.my_choice != null
        ? 'Answer locked in. Waiting for the reveal.'
        : 'Answer before the organiser reveals it.'
      action = state.question?.my_choice != null ? 'View' : 'Answer now'
      break
    case 'question_revealed':
      headline = state.question ? `Question ${state.question.number} revealed` : 'Answer revealed'
      detail = state.question?.my_choice == null
        ? 'See the answer and who was fastest.'
        : state.question.my_choice === state.question.correct_index
          ? 'You got it. See who was fastest.'
          : 'Not this one. See the answer.'
      action = 'See the answer'
      break
    case 'finished':
      headline = 'Quiz over'
      detail = `You scored ${scoreLine(state.my_score.correct, state.my_score.revealed || total)}. Only you can see this.`
      action = 'See your results'
      break
    default:
      headline = 'Quiz'
      detail = state.my_score.revealed > 0
        ? `${total} questions. So far you have ${scoreLine(state.my_score.correct, state.my_score.revealed)} right.`
        : `${total} ${total === 1 ? 'question' : 'questions'}. The organiser releases them during the auction.`
  }

  const live = phase === 'question_open'

  return (
    <div className={`card p-5 flex flex-col gap-3 ${live ? 'border-accent' : ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="label">Quiz</span>
        {live && (
          <span className="pill pill-live">
            <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
            Live
          </span>
        )}
        {phase === 'finished' && <span className="pill pill-quiet">Finished</span>}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="display text-base">{headline}</span>
        <span className="text-sm text-ink-3">{detail}</span>
      </div>
      {action && (
        <button
          type="button"
          onClick={onOpen}
          className={`btn self-start ${live ? 'btn-primary' : 'btn-ghost'}`}
        >
          {action}
        </button>
      )}
    </div>
  )
})

export default QuizCard
