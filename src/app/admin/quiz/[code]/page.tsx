'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Navigation from '@/components/layout/Navigation'
import ModernFooter from '@/components/layout/ModernFooter'
import QuizRunner from '@/components/admin/QuizRunner'
import QuizQuestionList from '@/components/admin/QuizQuestionList'
import QuizQuestionForm, { type QuizQuestionInput } from '@/components/admin/QuizQuestionForm'
import QuizLeaderboard from '@/components/admin/QuizLeaderboard'
import {
  normalizeQuizPhase,
  type AdminQuizResults,
  type QuizAction
} from '@/lib/quiz'

interface SessionRow {
  id: string
  code: string
  title: string
  current_round: number
}

/**
 * The organiser's quiz page for one session: write the questions, release
 * them one at a time during the auction, reveal each answer, and watch the
 * scores. Everything here is organiser-only; the phones get the pop-up.
 */
export default function AdminQuizPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()

  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [session, setSession] = useState<SessionRow | null>(null)
  const [results, setResults] = useState<AdminQuizResults | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Same sign-in gate as /admin.
  useEffect(() => {
    let live = true
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return
      setAuthed(!!data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setAuthed(!!sess)
    })
    return () => {
      live = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const loadResults = useCallback(async () => {
    if (!code) return
    const { data, error } = await supabase.rpc('get_quiz_admin_results', { p_session_code: code })
    if (error) throw error
    setResults({
      ...data,
      phase: normalizeQuizPhase(data?.phase),
      questions: Array.isArray(data?.questions) ? data.questions : [],
      leaderboard: Array.isArray(data?.leaderboard) ? data.leaderboard : []
    })
  }, [code])

  const loadAll = useCallback(async () => {
    if (!code) return
    setLoadError(null)
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, code, title, current_round')
        .eq('code', code)
        .eq('is_active', true)
        .single()
      if (error) throw error
      setSession(data)
      await loadResults()
    } catch (err) {
      console.error('Quiz admin: failed to load', err)
      setLoadError(err instanceof Error ? err.message : 'Could not load this session')
    }
  }, [code, loadResults])

  useEffect(() => {
    if (authed) loadAll()
  }, [authed, loadAll])

  // Answers land live. The phones never see this table; the organiser does,
  // so the counts and the leaderboard move as people tap.
  useEffect(() => {
    if (!session?.id) return

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => {
        loadResults().catch(err => console.error('Quiz admin: refresh failed', err))
      }, 250)
    }

    const channel = supabase
      .channel(`admin-quiz-${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_answers', filter: `session_id=eq.${session.id}` },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` },
        scheduleRefresh
      )
      .subscribe()

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      supabase.removeChannel(channel)
    }
  }, [session?.id, loadResults])

  const run = useCallback(async (action: QuizAction, questionId?: string) => {
    if (!code) return
    setBusy(true)
    try {
      const { error } = await supabase.rpc('run_quiz', {
        p_session_code: code,
        p_action: action,
        p_question_id: questionId ?? null
      })
      if (error) throw error
      await loadResults()
    } catch (err) {
      console.error('Quiz admin: action failed', err)
      alert(`Could not ${action} the question: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setBusy(false)
    }
  }, [code, loadResults])

  const addQuestion = useCallback(async (values: QuizQuestionInput): Promise<boolean> => {
    if (!session) return false
    setSaving(true)
    try {
      const nextPosition = (results?.questions.length ?? 0) + 1
      const { error } = await supabase.from('quiz_questions').insert({
        session_id: session.id,
        position: nextPosition,
        prompt: values.prompt,
        options: values.options,
        correct_index: values.correct_index
      })
      if (error) throw error
      await loadResults()
      return true
    } catch (err) {
      console.error('Quiz admin: add failed', err)
      alert(`Could not save the question: ${err instanceof Error ? err.message : 'Unknown error'}`)
      return false
    } finally {
      setSaving(false)
    }
  }, [session, results?.questions.length, loadResults])

  const updateQuestion = useCallback(async (questionId: string, values: QuizQuestionInput): Promise<boolean> => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .update({
          prompt: values.prompt,
          options: values.options,
          correct_index: values.correct_index
        })
        .eq('id', questionId)
      if (error) throw error
      await loadResults()
      return true
    } catch (err) {
      console.error('Quiz admin: update failed', err)
      alert(`Could not save the question: ${err instanceof Error ? err.message : 'Unknown error'}`)
      return false
    } finally {
      setSaving(false)
    }
  }, [loadResults])

  const deleteQuestion = useCallback(async (questionId: string) => {
    setSaving(true)
    try {
      const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId)
      if (error) throw error
      await loadResults()
    } catch (err) {
      console.error('Quiz admin: delete failed', err)
      alert(`Could not delete the question: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }, [loadResults])

  const revealedCount = results?.questions.filter(q => q.status === 'revealed').length ?? 0

  let content: React.ReactNode

  if (!ready) {
    content = <p className="text-center text-ink-3 py-16">Checking your sign-in…</p>
  } else if (!authed) {
    content = (
      <div className="max-w-xl mx-auto py-12 text-center flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="label">Quiz</span>
          <h1 className="text-3xl sm:text-4xl">Sign in to run the quiz</h1>
          <p className="text-ink-2 m-0">The quiz is run from the admin area.</p>
        </div>
        <div className="flex justify-center">
          <button className="btn btn-primary" onClick={() => router.push('/admin')}>
            Go to admin
          </button>
        </div>
      </div>
    )
  } else if (loadError) {
    content = (
      <div className="max-w-md mx-auto py-16 text-center">
        <h2 className="text-xl mb-2">This session would not load</h2>
        <p className="text-ink-2 mb-6">{loadError}</p>
        <div className="flex justify-center gap-2">
          <button onClick={loadAll} className="btn btn-primary">Try again</button>
          <button onClick={() => router.push('/admin')} className="btn btn-ghost">Back to admin</button>
        </div>
      </div>
    )
  } else if (!session || !results) {
    content = <p className="text-center text-ink-3 py-16">Loading the quiz…</p>
  } else {
    content = (
      <div className="animate-rise flex flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-hairline">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="label">Quiz</span>
            <h1 className="text-2xl sm:text-3xl truncate">{session.title || 'Fun Auction'}</h1>
            <p className="text-sm text-ink-3 m-0">
              Questions pop up over the auction on every joined phone. Bidding carries on underneath.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="num text-sm text-ink-3 border border-hairline rounded px-2 py-1">{session.code}</span>
            <button onClick={() => router.push(`/s/${session.code}`)} className="btn btn-ghost">
              Open session
            </button>
            <button onClick={() => router.push('/admin')} className="btn btn-ghost">
              Back to admin
            </button>
          </div>
        </header>

        <QuizRunner
          results={results}
          busy={busy}
          onRelease={(id) => run('open', id)}
          onReveal={() => run('reveal')}
          onHide={() => run('hide')}
          onFinish={() => run('finish')}
          onReset={() => run('reset')}
        />

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="label">Questions</span>
                <span className="text-sm text-ink-3">
                  {results.questions.length === 0
                    ? 'Asked in this order. Four options each, one right.'
                    : `${results.questions.length} ${results.questions.length === 1 ? 'question' : 'questions'}, asked in this order.`}
                </span>
              </div>
              {!showAdd && (
                <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
                  Add a question
                </button>
              )}
            </div>

            {showAdd && (
              <div className="card p-5 animate-rise flex flex-col gap-4">
                <span className="display text-base">New question</span>
                <QuizQuestionForm
                  submitLabel="Add question"
                  busy={saving}
                  onSubmit={addQuestion}
                  onCancel={() => setShowAdd(false)}
                />
              </div>
            )}

            <QuizQuestionList
              questions={results.questions}
              phase={results.phase}
              activeQuestionId={results.active_question_id}
              busy={busy || saving}
              onRelease={(id) => run('open', id)}
              onReveal={() => run('reveal')}
              onUpdate={updateQuestion}
              onDelete={deleteQuestion}
            />
          </div>

          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 card p-5 flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="label">Scores</span>
                <span className="num text-sm text-ink-3">
                  {revealedCount} of {results.questions.length} asked
                </span>
              </div>
              <p className="text-sm text-ink-3 m-0">
                Only you see this. Each phone sees its own score and nobody else&apos;s.
              </p>
              <QuizLeaderboard rows={results.leaderboard} outOf={revealedCount} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Navigation />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {content}
      </div>
      <ModernFooter />
    </main>
  )
}
