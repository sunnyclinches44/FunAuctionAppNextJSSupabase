-- ============ QUIZ MIGRATION ============
-- Adds the live quiz ("fastest finger first") to an existing Fun Auction
-- database. Run this ENTIRE file in the Supabase SQL Editor.
-- Safe to run more than once.
--
-- Requires rounds_migration.sql (or complete_setup.sql) to have run first.
--
-- How it works:
--   * The organiser writes questions for a session (4 options, one correct).
--   * During the auction the organiser releases a question. Every joined
--     phone gets a pop-up over the auction, answers, and waits.
--   * The organiser reveals the answer. Everyone sees the right option,
--     whether their own pick was right, and who answered fastest.
--   * After the last question the organiser finishes the quiz. Each person
--     sees their own score only. The organiser sees everyone's.
--
-- Privacy and fairness, enforced here rather than in the browser:
--   * Participants (anon) have NO table access to quiz_questions or
--     quiz_answers. They only see what get_quiz_state() hands back, and it
--     never includes the correct option until the question is revealed.
--   * A participant only ever receives their own answers. Other people's
--     picks are aggregated (counts) or limited to the one fastest name.
--   * The organiser (signed in) reads and writes the tables directly.
--
-- Realtime rides on the sessions table, which phones already listen to:
-- releasing or revealing a question updates sessions.quiz_phase and
-- sessions.active_question_id, and every phone refetches its quiz state.

-- ============ STEP 1: TABLES ============

CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  position smallint NOT NULL DEFAULT 1,
  prompt text NOT NULL,
  options text[] NOT NULL,
  correct_index smallint NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  opened_at timestamptz,
  revealed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quiz_questions_four_options CHECK (array_length(options, 1) = 4),
  CONSTRAINT quiz_questions_correct_range CHECK (correct_index BETWEEN 0 AND 3),
  CONSTRAINT quiz_questions_status CHECK (status IN ('draft', 'open', 'revealed'))
);

CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  choice_index smallint NOT NULL,
  is_correct boolean NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT quiz_answers_choice_range CHECK (choice_index BETWEEN 0 AND 3),
  -- One answer per person per question. First tap wins; there is no changing it.
  UNIQUE (question_id, participant_id)
);

-- The live pointer. Phones already subscribe to UPDATEs on sessions, so this
-- is what carries "a question just went live" to the room.
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS quiz_phase text NOT NULL DEFAULT 'idle';

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS active_question_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sessions_quiz_phase_check'
      AND conrelid = 'public.sessions'::regclass
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_quiz_phase_check
      CHECK (quiz_phase IN ('idle', 'question_open', 'question_revealed', 'finished'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sessions_active_question_fk'
      AND conrelid = 'public.sessions'::regclass
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_active_question_fk
      FOREIGN KEY (active_question_id)
      REFERENCES public.quiz_questions(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- ============ STEP 2: INDEXES ============

CREATE INDEX IF NOT EXISTS idx_quiz_questions_session ON public.quiz_questions(session_id, position);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON public.quiz_answers(question_id, answered_at);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_session ON public.quiz_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_participant ON public.quiz_answers(participant_id);

-- ============ STEP 3: ROW LEVEL SECURITY ============
-- Only the signed-in organiser touches these tables directly. Participants
-- go through the RPC functions below, which run as the function owner.

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_questions_admin_all ON public.quiz_questions;
CREATE POLICY quiz_questions_admin_all
ON public.quiz_questions
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS quiz_answers_admin_select ON public.quiz_answers;
CREATE POLICY quiz_answers_admin_select
ON public.quiz_answers
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Deliberately no anon policies. Without one, anon cannot read either table,
-- which is what keeps the answer key off the phones.

-- ============ STEP 4: get_session_details CARRIES THE QUIZ POINTER ============

DROP FUNCTION IF EXISTS public.get_session_details(text);

CREATE OR REPLACE FUNCTION public.get_session_details(p_session_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session sessions;
  v_participants json;
  v_total_amount numeric;
BEGIN
  SELECT * INTO v_session
  FROM sessions
  WHERE code = p_session_code AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'display_name', p.display_name,
      'amount', p.amount,
      'device_id', p.device_id,
      'created_at', p.created_at
    ) ORDER BY p.created_at
  ) INTO v_participants
  FROM participants p
  WHERE p.session_id = v_session.id;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_amount
  FROM participants
  WHERE session_id = v_session.id;

  RETURN json_build_object(
    'session', json_build_object(
      'id', v_session.id,
      'code', v_session.code,
      'title', v_session.title,
      'current_round', v_session.current_round,
      'quiz_phase', v_session.quiz_phase,
      'active_question_id', v_session.active_question_id,
      'created_at', v_session.created_at
    ),
    'participants', COALESCE(v_participants, '[]'::json),
    'total_amount', v_total_amount,
    'participant_count', CASE WHEN v_participants IS NULL THEN 0 ELSE json_array_length(v_participants) END
  );
END;
$$;

-- ============ STEP 5: PARTICIPANT RPCs ============

-- Everything a phone needs to draw the quiz pop-up, and nothing it must not
-- have. The correct option and the fastest name appear only once the
-- question is revealed. Other people's picks never appear at all.
DROP FUNCTION IF EXISTS public.get_quiz_state(text, text);

CREATE OR REPLACE FUNCTION public.get_quiz_state(
  p_session_code text,
  p_device_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session sessions;
  v_participant_id uuid;
  v_q quiz_questions;
  v_number int;
  v_count int;
  v_answered int;
  v_correct int;
  v_my_choice smallint;
  v_fastest json;
  v_question json;
  v_results json;
  v_score_correct int;
  v_score_answered int;
  v_revealed_total int;
  v_phase text;
BEGIN
  SELECT * INTO v_session
  FROM sessions
  WHERE code = p_session_code AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;

  SELECT id INTO v_participant_id
  FROM participants
  WHERE session_id = v_session.id AND device_id = p_device_id;

  SELECT count(*) INTO v_count
  FROM quiz_questions
  WHERE session_id = v_session.id;

  v_phase := v_session.quiz_phase;

  -- The live question, if there is one.
  IF v_session.active_question_id IS NOT NULL THEN
    SELECT * INTO v_q
    FROM quiz_questions
    WHERE id = v_session.active_question_id AND session_id = v_session.id;
  END IF;

  IF v_q.id IS NULL AND v_phase IN ('question_open', 'question_revealed') THEN
    -- The question was deleted under a live pointer. Treat it as idle.
    v_phase := 'idle';
  END IF;

  IF v_q.id IS NOT NULL THEN
    SELECT n INTO v_number
    FROM (
      SELECT id, row_number() OVER (ORDER BY position, created_at) AS n
      FROM quiz_questions
      WHERE session_id = v_session.id
    ) numbered
    WHERE id = v_q.id;

    SELECT count(*), count(*) FILTER (WHERE is_correct)
      INTO v_answered, v_correct
    FROM quiz_answers
    WHERE question_id = v_q.id;

    IF v_participant_id IS NOT NULL THEN
      SELECT choice_index INTO v_my_choice
      FROM quiz_answers
      WHERE question_id = v_q.id AND participant_id = v_participant_id;
    END IF;

    IF v_q.status = 'revealed' THEN
      SELECT json_agg(
        json_build_object(
          'display_name', f.display_name,
          'seconds', f.seconds
        ) ORDER BY f.seconds
      ) INTO v_fastest
      FROM (
        SELECT p.display_name,
               round(extract(epoch FROM (a.answered_at - v_q.opened_at))::numeric, 1) AS seconds
        FROM quiz_answers a
        JOIN participants p ON p.id = a.participant_id
        WHERE a.question_id = v_q.id AND a.is_correct
        ORDER BY a.answered_at
        -- Only the winner. With a room of fifty, a list of names is a wall
        -- of other people's business and a scrollbar; one name is the story.
        LIMIT 1
      ) f;
    END IF;

    v_question := json_build_object(
      'id', v_q.id,
      'number', v_number,
      'prompt', v_q.prompt,
      'options', to_json(v_q.options),
      'status', v_q.status,
      'opened_at', v_q.opened_at,
      'revealed_at', v_q.revealed_at,
      'answered_count', v_answered,
      'correct_count', CASE WHEN v_q.status = 'revealed' THEN v_correct ELSE NULL END,
      'my_choice', v_my_choice,
      -- The answer key, only once the organiser has revealed it.
      'correct_index', CASE WHEN v_q.status = 'revealed' THEN v_q.correct_index ELSE NULL END,
      'fastest', COALESCE(v_fastest, '[]'::json)
    );
  END IF;

  -- This person's own record over every revealed question. Nobody else's.
  SELECT
    COALESCE(json_agg(
      json_build_object(
        'id', r.id,
        'number', r.n,
        'prompt', r.prompt,
        'options', to_json(r.options),
        'correct_index', r.correct_index,
        'my_choice', r.choice_index,
        'is_correct', COALESCE(r.is_correct, false)
      ) ORDER BY r.n
    ), '[]'::json),
    COALESCE(count(*) FILTER (WHERE r.is_correct), 0),
    COALESCE(count(*) FILTER (WHERE r.choice_index IS NOT NULL), 0),
    COALESCE(count(*), 0)
  INTO v_results, v_score_correct, v_score_answered, v_revealed_total
  FROM (
    SELECT q.id, q.prompt, q.options, q.correct_index,
           row_number() OVER (ORDER BY q.position, q.created_at) AS n,
           q.status,
           a.choice_index, a.is_correct
    FROM quiz_questions q
    LEFT JOIN quiz_answers a
      ON a.question_id = q.id AND a.participant_id = v_participant_id
    WHERE q.session_id = v_session.id
  ) r
  WHERE r.status = 'revealed';

  RETURN json_build_object(
    'phase', v_phase,
    'question_count', v_count,
    'joined', v_participant_id IS NOT NULL,
    'question', v_question,
    'my_score', json_build_object(
      'correct', v_score_correct,
      'answered', v_score_answered,
      'revealed', v_revealed_total,
      'total', v_count
    ),
    'my_results', v_results
  );
END;
$$;

-- Lock in an answer. Server time decides who was fastest, not the phone.
-- Does not say whether the answer was right: that waits for the reveal.
DROP FUNCTION IF EXISTS public.submit_quiz_answer(text, text, uuid, smallint);

CREATE OR REPLACE FUNCTION public.submit_quiz_answer(
  p_session_code text,
  p_device_id text,
  p_question_id uuid,
  p_choice smallint
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session sessions;
  v_participant_id uuid;
  v_q quiz_questions;
  v_answer_id uuid;
BEGIN
  IF p_choice IS NULL OR p_choice < 0 OR p_choice > 3 THEN
    RAISE EXCEPTION 'Pick one of the four options';
  END IF;

  IF p_device_id IS NULL OR trim(p_device_id) = '' THEN
    RAISE EXCEPTION 'Device ID is required';
  END IF;

  SELECT * INTO v_session
  FROM sessions
  WHERE code = p_session_code AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;

  SELECT id INTO v_participant_id
  FROM participants
  WHERE session_id = v_session.id AND device_id = p_device_id;

  IF v_participant_id IS NULL THEN
    RAISE EXCEPTION 'Join the auction before answering';
  END IF;

  SELECT * INTO v_q
  FROM quiz_questions
  WHERE id = p_question_id AND session_id = v_session.id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found';
  END IF;

  -- The gate: only the live, still-open question takes answers.
  IF v_q.status <> 'open' OR v_session.active_question_id IS DISTINCT FROM v_q.id THEN
    RAISE EXCEPTION 'This question is closed';
  END IF;

  INSERT INTO quiz_answers (session_id, question_id, participant_id, choice_index, is_correct)
  VALUES (v_session.id, v_q.id, v_participant_id, p_choice, p_choice = v_q.correct_index)
  ON CONFLICT (question_id, participant_id) DO NOTHING
  RETURNING id INTO v_answer_id;

  IF v_answer_id IS NULL THEN
    RAISE EXCEPTION 'You have already answered this question';
  END IF;

  RETURN json_build_object(
    'success', true,
    'question_id', v_q.id,
    'choice', p_choice
  );
END;
$$;

-- ============ STEP 6: ORGANISER RPCs ============

-- The one control the organiser presses during the event.
--   open    p_question_id goes live (any other open question is revealed first,
--           and any earlier answers to this question are cleared)
--   reveal  the live question shows its answer
--   hide    take the pop-up off the phones, nothing else changes
--   finish  the quiz is over; phones show their own score
--   reset   wipe every answer and put every question back to draft
DROP FUNCTION IF EXISTS public.run_quiz(text, text, uuid);

CREATE OR REPLACE FUNCTION public.run_quiz(
  p_session_code text,
  p_action text,
  p_question_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session sessions;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Only a signed-in admin can run the quiz';
  END IF;

  SELECT * INTO v_session
  FROM sessions
  WHERE code = p_session_code AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;

  IF p_action = 'open' THEN
    IF p_question_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM quiz_questions WHERE id = p_question_id AND session_id = v_session.id
    ) THEN
      RAISE EXCEPTION 'Question not found in this session';
    END IF;

    UPDATE quiz_questions
    SET status = 'revealed', revealed_at = COALESCE(revealed_at, now())
    WHERE session_id = v_session.id AND status = 'open' AND id <> p_question_id;

    DELETE FROM quiz_answers WHERE question_id = p_question_id;

    UPDATE quiz_questions
    SET status = 'open', opened_at = now(), revealed_at = NULL
    WHERE id = p_question_id;

    UPDATE sessions
    SET quiz_phase = 'question_open', active_question_id = p_question_id
    WHERE id = v_session.id;

  ELSIF p_action = 'reveal' THEN
    IF v_session.active_question_id IS NULL THEN
      RAISE EXCEPTION 'No question is live';
    END IF;

    UPDATE quiz_questions
    SET status = 'revealed', revealed_at = COALESCE(revealed_at, now())
    WHERE id = v_session.active_question_id;

    UPDATE sessions
    SET quiz_phase = 'question_revealed'
    WHERE id = v_session.id;

  ELSIF p_action = 'hide' THEN
    UPDATE quiz_questions
    SET status = 'revealed', revealed_at = COALESCE(revealed_at, now())
    WHERE session_id = v_session.id AND status = 'open';

    UPDATE sessions
    SET quiz_phase = 'idle', active_question_id = NULL
    WHERE id = v_session.id;

  ELSIF p_action = 'finish' THEN
    UPDATE quiz_questions
    SET status = 'revealed', revealed_at = COALESCE(revealed_at, now())
    WHERE session_id = v_session.id AND status = 'open';

    UPDATE sessions
    SET quiz_phase = 'finished', active_question_id = NULL
    WHERE id = v_session.id;

  ELSIF p_action = 'reset' THEN
    DELETE FROM quiz_answers WHERE session_id = v_session.id;

    UPDATE quiz_questions
    SET status = 'draft', opened_at = NULL, revealed_at = NULL
    WHERE session_id = v_session.id;

    UPDATE sessions
    SET quiz_phase = 'idle', active_question_id = NULL
    WHERE id = v_session.id;

  ELSE
    RAISE EXCEPTION 'Unknown quiz action: %', p_action;
  END IF;

  SELECT * INTO v_session FROM sessions WHERE id = v_session.id;

  RETURN json_build_object(
    'success', true,
    'phase', v_session.quiz_phase,
    'active_question_id', v_session.active_question_id
  );
END;
$$;

-- Everything the organiser's quiz page shows: every question with every
-- answer, and a leaderboard. This is the only place anyone sees who got
-- what; the phones never receive it.
DROP FUNCTION IF EXISTS public.get_quiz_admin_results(text);

CREATE OR REPLACE FUNCTION public.get_quiz_admin_results(p_session_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session sessions;
  v_questions json;
  v_leaderboard json;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Only a signed-in admin can see quiz results';
  END IF;

  SELECT * INTO v_session
  FROM sessions
  WHERE code = p_session_code AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id', q.id,
      'number', q.n,
      'prompt', q.prompt,
      'options', to_json(q.options),
      'correct_index', q.correct_index,
      'status', q.status,
      'opened_at', q.opened_at,
      'revealed_at', q.revealed_at,
      'answered_count', (SELECT count(*) FROM quiz_answers a WHERE a.question_id = q.id),
      'correct_count', (SELECT count(*) FROM quiz_answers a WHERE a.question_id = q.id AND a.is_correct),
      'answers', COALESCE((
        SELECT json_agg(
          json_build_object(
            'participant_id', a.participant_id,
            'display_name', p.display_name,
            'choice_index', a.choice_index,
            'is_correct', a.is_correct,
            'seconds', round(extract(epoch FROM (a.answered_at - q.opened_at))::numeric, 1)
          ) ORDER BY a.answered_at
        )
        FROM quiz_answers a
        JOIN participants p ON p.id = a.participant_id
        WHERE a.question_id = q.id
      ), '[]'::json)
    ) ORDER BY q.n
  ), '[]'::json)
  INTO v_questions
  FROM (
    SELECT *, row_number() OVER (ORDER BY position, created_at) AS n
    FROM quiz_questions
    WHERE session_id = v_session.id
  ) q;

  SELECT COALESCE(json_agg(
    json_build_object(
      'participant_id', l.participant_id,
      'display_name', l.display_name,
      'correct', l.correct,
      'answered', l.answered,
      'fastest_wins', l.fastest_wins,
      'total_seconds', l.total_seconds
    ) ORDER BY l.correct DESC, l.fastest_wins DESC, l.total_seconds ASC, l.display_name
  ), '[]'::json)
  INTO v_leaderboard
  FROM (
    SELECT
      p.id AS participant_id,
      p.display_name,
      count(a.id) FILTER (WHERE a.is_correct) AS correct,
      count(a.id) AS answered,
      -- How many questions this person was the first correct answer on.
      count(*) FILTER (
        WHERE a.is_correct AND a.answered_at = (
          SELECT min(b.answered_at) FROM quiz_answers b
          WHERE b.question_id = a.question_id AND b.is_correct
        )
      ) AS fastest_wins,
      COALESCE(round((sum(
        extract(epoch FROM (a.answered_at - q.opened_at))
      ) FILTER (WHERE a.is_correct))::numeric, 1), 0) AS total_seconds
    FROM participants p
    LEFT JOIN quiz_answers a ON a.participant_id = p.id
    LEFT JOIN quiz_questions q ON q.id = a.question_id
    WHERE p.session_id = v_session.id
    GROUP BY p.id, p.display_name
  ) l;

  RETURN json_build_object(
    'phase', v_session.quiz_phase,
    'active_question_id', v_session.active_question_id,
    'question_count', (SELECT count(*) FROM quiz_questions WHERE session_id = v_session.id),
    'participant_count', (SELECT count(*) FROM participants WHERE session_id = v_session.id),
    'questions', v_questions,
    'leaderboard', v_leaderboard
  );
END;
$$;

-- ============ STEP 7: GRANTS ============

-- The organiser edits questions and reads answers straight from the tables
-- (RLS above limits both to signed-in users). Nothing is granted to anon.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT SELECT ON public.quiz_answers TO authenticated;
REVOKE ALL ON public.quiz_questions FROM anon;
REVOKE ALL ON public.quiz_answers FROM anon;

GRANT EXECUTE ON FUNCTION public.get_session_details(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_quiz_state(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_answer(text, text, uuid, smallint) TO anon, authenticated;

-- Organiser only. Not granted to anon: a phone must not be able to release
-- a question or read the room's answers.
REVOKE ALL ON FUNCTION public.run_quiz(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_quiz(text, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_quiz_admin_results(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quiz_admin_results(text) TO authenticated;

-- ============ STEP 8: REALTIME ============
-- sessions is already published (rounds_migration.sql), which is what carries
-- the question going live to the phones. quiz_answers is published so the
-- organiser's page can count answers as they land. RLS applies to realtime,
-- so anon subscribers receive nothing from quiz_answers.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'quiz_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_answers;
  END IF;
END
$$;

ALTER TABLE public.quiz_answers REPLICA IDENTITY FULL;

-- ============ STEP 9: VERIFY ============
-- Expect every row to read OK.

SELECT 'quiz tables' AS check_name,
       CASE WHEN count(*) = 2 THEN 'OK' ELSE 'MISSING' END AS status
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN ('quiz_questions', 'quiz_answers')

UNION ALL
SELECT 'session quiz columns',
       CASE WHEN count(*) = 2 THEN 'OK' ELSE 'MISSING' END
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'sessions'
   AND column_name IN ('quiz_phase', 'active_question_id')

UNION ALL
SELECT 'quiz functions',
       CASE WHEN count(*) = 4 THEN 'OK' ELSE 'MISSING' END
  FROM information_schema.routines
 WHERE routine_schema = 'public'
   AND routine_name IN ('get_quiz_state', 'submit_quiz_answer', 'run_quiz', 'get_quiz_admin_results')

UNION ALL
SELECT 'quiz realtime',
       CASE WHEN count(*) = 1 THEN 'OK' ELSE 'MISSING' END
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime'
   AND schemaname = 'public'
   AND tablename = 'quiz_answers';

-- ============ END OF QUIZ MIGRATION ============
