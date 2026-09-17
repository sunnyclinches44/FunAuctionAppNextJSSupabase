-- ============ ROUNDS MIGRATION ============
-- Adds three-round bidding to an existing Fun Auction database.
-- Run this ENTIRE file in the Supabase SQL Editor.
-- Safe to run more than once.
--
-- Round ladder (cumulative - what unlocks stays unlocked):
--   Round 1  Warm-up     $5, $10
--   Round 2  Stakes up   $5, $10, $20, $50
--   Round 3  Open        any amount from $5 to $10,000

-- ============ STEP 1: ADD current_round TO SESSIONS ============

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS current_round smallint NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sessions_current_round_range'
      AND conrelid = 'public.sessions'::regclass
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_current_round_range
      CHECK (current_round BETWEEN 1 AND 3);
  END IF;
END
$$;

-- ============ STEP 2: ROUND HELPER ============

-- Returns true when p_amount may be bid in p_round.
CREATE OR REPLACE FUNCTION public.amount_allowed_in_round(
  p_amount numeric,
  p_round smallint
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_round >= 3 THEN p_amount >= 5 AND p_amount <= 10000
    WHEN p_round = 2  THEN p_amount IN (5, 10, 20, 50)
    ELSE                   p_amount IN (5, 10)
  END;
$$;

-- ============ STEP 3: ROUND-AWARE place_bid ============

DROP FUNCTION IF EXISTS public.place_bid(text, text, numeric);

CREATE OR REPLACE FUNCTION public.place_bid(
  p_session_code text,
  p_device_id text,
  p_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_participant_id uuid;
  v_current_amount numeric;
  v_round smallint;
BEGIN
  IF p_amount IS NULL OR p_amount < 5 THEN
    RAISE EXCEPTION 'Amount must be at least $5';
  END IF;

  IF p_amount > 10000 THEN
    RAISE EXCEPTION 'Amount must be $10,000 or less';
  END IF;

  IF p_amount <> floor(p_amount) THEN
    RAISE EXCEPTION 'Amount must be a whole number';
  END IF;

  IF p_device_id IS NULL OR trim(p_device_id) = '' THEN
    RAISE EXCEPTION 'Device ID is required';
  END IF;

  IF p_session_code IS NULL OR trim(p_session_code) = '' THEN
    RAISE EXCEPTION 'Session code is required';
  END IF;

  -- Get session, its current round, and the participant
  SELECT s.id, s.current_round, p.id, p.amount
    INTO v_session_id, v_round, v_participant_id, v_current_amount
  FROM sessions s
  JOIN participants p ON p.session_id = s.id
  WHERE s.code = p_session_code
    AND s.is_active = true
    AND p.device_id = p_device_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session or participant not found';
  END IF;

  -- The round gate. The client disables locked buttons, but this is what enforces it.
  IF NOT public.amount_allowed_in_round(p_amount, v_round) THEN
    RAISE EXCEPTION '$% is not available in round %', p_amount, v_round;
  END IF;

  UPDATE participants
  SET amount = v_current_amount + p_amount
  WHERE id = v_participant_id;

  INSERT INTO bids (session_id, participant_id, delta)
  VALUES (v_session_id, v_participant_id, p_amount);

  RETURN json_build_object(
    'success', true,
    'new_total', v_current_amount + p_amount,
    'bid_amount', p_amount,
    'round', v_round
  );
END;
$$;

-- ============ STEP 4: get_session_details RETURNS current_round ============

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
      'created_at', v_session.created_at
    ),
    'participants', COALESCE(v_participants, '[]'::json),
    'total_amount', v_total_amount,
    'participant_count', CASE WHEN v_participants IS NULL THEN 0 ELSE json_array_length(v_participants) END
  );
END;
$$;

-- ============ STEP 5: set_session_round (ADMIN ONLY) ============

DROP FUNCTION IF EXISTS public.set_session_round(text, smallint);

CREATE OR REPLACE FUNCTION public.set_session_round(
  p_session_code text,
  p_round smallint
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Only a signed-in admin may move the room between rounds.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Only a signed-in admin can change the round';
  END IF;

  IF p_round IS NULL OR p_round < 1 OR p_round > 3 THEN
    RAISE EXCEPTION 'Round must be 1, 2 or 3';
  END IF;

  UPDATE sessions
  SET current_round = p_round
  WHERE code = p_session_code AND is_active = true
  RETURNING id INTO v_session_id;

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;

  RETURN json_build_object(
    'success', true,
    'session_id', v_session_id,
    'current_round', p_round
  );
END;
$$;

-- ============ STEP 6: GRANTS ============

GRANT EXECUTE ON FUNCTION public.amount_allowed_in_round(numeric, smallint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(text, text, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_details(text) TO anon, authenticated;

-- Deliberately NOT granted to anon: participants must not be able to advance the round.
REVOKE ALL ON FUNCTION public.set_session_round(text, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_session_round(text, smallint) TO authenticated;

-- ============ STEP 7: REALTIME ON SESSIONS ============
-- Participants' phones need UPDATE events on sessions to flip rounds without a refresh.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;
END
$$;

-- Realtime only sends old-record data for DELETE when the replica identity is full.
ALTER TABLE public.sessions REPLICA IDENTITY FULL;

-- ============ STEP 8: VERIFY ============
-- Expect: current_round column present, all four functions listed.
--
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'current_round';
--
-- SELECT routine_name FROM information_schema.routines
--  WHERE routine_schema = 'public'
--    AND routine_name IN ('place_bid','get_session_details','set_session_round','amount_allowed_in_round');
--
-- Round gate spot-check (expect: t, f, t, t, f, t):
-- SELECT public.amount_allowed_in_round(10, 1::smallint),
--        public.amount_allowed_in_round(20, 1::smallint),
--        public.amount_allowed_in_round(20, 2::smallint),
--        public.amount_allowed_in_round(50, 2::smallint),
--        public.amount_allowed_in_round(75, 2::smallint),
--        public.amount_allowed_in_round(75, 3::smallint);

-- ============ END OF ROUNDS MIGRATION ============
