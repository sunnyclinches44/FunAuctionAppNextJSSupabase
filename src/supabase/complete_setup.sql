-- =====================================================================
--  FUN AUCTION - COMPLETE DATABASE SETUP (single file)
-- =====================================================================
--  For a BRAND NEW Supabase project. Paste this whole file into the
--  Supabase SQL Editor and press Run. That is the only database step.
--
--  This file replaces master_schema.sql + rounds_migration.sql. You do
--  not need to run those as well.
--
--  Safe to run more than once. Every statement is idempotent, so if a
--  run is interrupted you can simply run the whole file again.
--
--  What it creates:
--    1. Tables        sessions, participants, bids
--    2. Indexes
--    3. Row Level Security + policies
--    4. RPC functions join_session, place_bid, undo_last_bid,
--                     get_session_details, set_session_round,
--                     amount_allowed_in_round
--    5. Grants
--    6. Realtime publication (live bids and live round changes)
--
--  The round ladder, cumulative so what unlocks stays unlocked:
--    Round 1  Warm-up     $5, $10
--    Round 2  Stakes up   $5, $10, $20, $50
--    Round 3  Open        any whole amount from $5 to $10,000
-- =====================================================================


-- =====================================================================
--  STEP 1: TABLES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  current_round smallint NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text,
  display_name text NOT NULL,
  mobile_number text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (session_id, user_id),
  UNIQUE (session_id, device_id)
);

CREATE TABLE IF NOT EXISTS public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  delta numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- current_round is added separately as well, so this file also upgrades a
-- database created before rounds existed.
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


-- =====================================================================
--  STEP 2: INDEXES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_sessions_code       ON public.sessions(code);
CREATE INDEX IF NOT EXISTS idx_sessions_active     ON public.sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON public.sessions(created_by);

CREATE INDEX IF NOT EXISTS idx_participants_session ON public.participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_device  ON public.participants(device_id);
CREATE INDEX IF NOT EXISTS idx_participants_user    ON public.participants(user_id);

CREATE INDEX IF NOT EXISTS idx_bids_session     ON public.bids(session_id);
CREATE INDEX IF NOT EXISTS idx_bids_participant ON public.bids(participant_id);


-- =====================================================================
--  STEP 3: ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE public.sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids         ENABLE ROW LEVEL SECURITY;


-- =====================================================================
--  STEP 4: POLICIES
-- =====================================================================

-- ---- sessions ----

-- Only a signed-in organiser can create a session, and only as themselves.
DROP POLICY IF EXISTS sessions_insert_creator ON public.sessions;
CREATE POLICY sessions_insert_creator
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Anyone with the code can read an active session. Needed by bidders, and
-- needed by realtime before it will deliver round changes to a phone.
DROP POLICY IF EXISTS sessions_select_by_code_active ON public.sessions;
CREATE POLICY sessions_select_by_code_active
ON public.sessions
FOR SELECT
TO authenticated, anon
USING (is_active = true);

DROP POLICY IF EXISTS sessions_delete_creator ON public.sessions;
CREATE POLICY sessions_delete_creator
ON public.sessions
FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR auth.uid() IS NOT NULL);

-- Note: there is deliberately NO update policy on sessions. The round is
-- changed only through set_session_round(), which is SECURITY DEFINER and
-- granted to signed-in users alone.

-- ---- participants ----

DROP POLICY IF EXISTS participants_select_session_members ON public.participants;
CREATE POLICY participants_select_session_members
ON public.participants
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = participants.session_id AND s.is_active = true
  )
);

DROP POLICY IF EXISTS participants_insert_self ON public.participants;
CREATE POLICY participants_insert_self
ON public.participants
FOR INSERT
TO authenticated, anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = participants.session_id AND s.is_active = true
  )
);

DROP POLICY IF EXISTS participants_update_self ON public.participants;
CREATE POLICY participants_update_self
ON public.participants
FOR UPDATE
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = participants.session_id AND s.is_active = true
  )
);

DROP POLICY IF EXISTS participants_delete_admin ON public.participants;
CREATE POLICY participants_delete_admin
ON public.participants
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- ---- bids ----

DROP POLICY IF EXISTS bids_select_session_members ON public.bids;
CREATE POLICY bids_select_session_members
ON public.bids
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = bids.session_id AND s.is_active = true
  )
);

DROP POLICY IF EXISTS bids_insert_owner_only ON public.bids;
CREATE POLICY bids_insert_owner_only
ON public.bids
FOR INSERT
TO authenticated, anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = bids.session_id AND s.is_active = true
  )
);


-- =====================================================================
--  STEP 5: RPC FUNCTIONS
-- =====================================================================

DROP FUNCTION IF EXISTS public.join_session(text, text, text, text);
DROP FUNCTION IF EXISTS public.place_bid(text, text, numeric);
DROP FUNCTION IF EXISTS public.get_session_details(text);
DROP FUNCTION IF EXISTS public.undo_last_bid(text, text);
DROP FUNCTION IF EXISTS public.set_session_round(text, smallint);


-- ---------------------------------------------------------------------
--  amount_allowed_in_round - the round gate itself
--
--  Mirrored in TypeScript by ROUNDS in src/lib/constants.ts, which is
--  what hides the buttons. THIS is what enforces the rule. Change one,
--  change the other.
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
--  join_session - create or update a participant
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_session(
  p_session_code text,
  p_display_name text,
  p_device_id text,
  p_mobile_number text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_participant_id uuid;
  v_existing_participant participants;
BEGIN
  IF p_display_name IS NULL OR trim(p_display_name) = '' THEN
    RAISE EXCEPTION 'Display name is required';
  END IF;

  IF p_device_id IS NULL OR trim(p_device_id) = '' THEN
    RAISE EXCEPTION 'Device ID is required';
  END IF;

  IF p_session_code IS NULL OR trim(p_session_code) = '' THEN
    RAISE EXCEPTION 'Session code is required';
  END IF;

  IF p_mobile_number IS NULL OR trim(p_mobile_number) = '' THEN
    RAISE EXCEPTION 'Mobile number is required';
  END IF;

  SELECT id INTO v_session_id
  FROM sessions
  WHERE code = p_session_code AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;

  SELECT * INTO v_existing_participant
  FROM participants
  WHERE session_id = v_session_id AND device_id = p_device_id;

  IF v_existing_participant IS NOT NULL THEN
    UPDATE participants
    SET display_name = p_display_name, mobile_number = p_mobile_number
    WHERE id = v_existing_participant.id
    RETURNING id INTO v_participant_id;

    RETURN json_build_object(
      'success', true,
      'action', 'updated',
      'participant_id', v_participant_id,
      'session_id', v_session_id,
      'display_name', p_display_name
    );
  ELSE
    INSERT INTO participants (session_id, device_id, display_name, mobile_number, amount)
    VALUES (v_session_id, p_device_id, p_display_name, p_mobile_number, 0)
    RETURNING id INTO v_participant_id;

    RETURN json_build_object(
      'success', true,
      'action', 'created',
      'participant_id', v_participant_id,
      'session_id', v_session_id,
      'display_name', p_display_name
    );
  END IF;
END;
$$;


-- ---------------------------------------------------------------------
--  place_bid - round aware
-- ---------------------------------------------------------------------
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

  -- The round gate. The browser hides locked amounts, but this is the
  -- control: a bidder calling the RPC straight from the console is refused.
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


-- ---------------------------------------------------------------------
--  get_session_details - includes current_round
-- ---------------------------------------------------------------------
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
    'participant_count',
      CASE WHEN v_participants IS NULL THEN 0 ELSE json_array_length(v_participants) END
  );
END;
$$;


-- ---------------------------------------------------------------------
--  undo_last_bid - remove a participant's most recent bid
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.undo_last_bid(
  p_session_code text,
  p_device_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_participant_id uuid;
  v_last_bid_id uuid;
  v_last_bid_amount numeric;
  v_new_total numeric;
BEGIN
  IF p_device_id IS NULL OR trim(p_device_id) = '' THEN
    RAISE EXCEPTION 'Device ID is required';
  END IF;

  IF p_session_code IS NULL OR trim(p_session_code) = '' THEN
    RAISE EXCEPTION 'Session code is required';
  END IF;

  SELECT s.id, p.id INTO v_session_id, v_participant_id
  FROM sessions s
  JOIN participants p ON p.session_id = s.id
  WHERE s.code = p_session_code
    AND s.is_active = true
    AND p.device_id = p_device_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session or participant not found';
  END IF;

  SELECT id, delta INTO v_last_bid_id, v_last_bid_amount
  FROM bids
  WHERE session_id = v_session_id
    AND participant_id = v_participant_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No bids found to undo';
  END IF;

  v_new_total := GREATEST(
    0,
    (SELECT amount FROM participants WHERE id = v_participant_id) - v_last_bid_amount
  );

  UPDATE participants
  SET amount = v_new_total
  WHERE id = v_participant_id;

  DELETE FROM bids
  WHERE id = v_last_bid_id;

  RETURN json_build_object(
    'success', true,
    'undone_amount', v_last_bid_amount,
    'new_total', v_new_total,
    'message', 'Last bid successfully undone'
  );
END;
$$;


-- ---------------------------------------------------------------------
--  set_session_round - ADMIN ONLY
--
--  This is what the organiser presses to open round 2 and round 3.
--  Guarded by auth.uid(), and granted to signed-in users alone, so a
--  participant cannot open a round for themselves.
-- ---------------------------------------------------------------------
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


-- =====================================================================
--  STEP 6: GRANTS
-- =====================================================================

GRANT EXECUTE ON FUNCTION public.amount_allowed_in_round(numeric, smallint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_session(text, text, text, text)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(text, text, numeric)             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_details(text)                  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.undo_last_bid(text, text)                  TO anon, authenticated;

-- Deliberately NOT granted to anon.
REVOKE ALL  ON FUNCTION public.set_session_round(text, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_session_round(text, smallint) TO authenticated;


-- =====================================================================
--  STEP 7: REALTIME
--
--  Without this nothing updates live: no incoming bids, no new joiners,
--  and rounds would need a page refresh to appear. A new Supabase
--  project starts with an empty publication, so all three tables have
--  to be added.
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sessions', 'participants', 'bids'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END
$$;

-- Realtime only carries the old row on UPDATE and DELETE when the replica
-- identity is full. The app reads old.id when a participant is removed.
ALTER TABLE public.sessions     REPLICA IDENTITY FULL;
ALTER TABLE public.participants REPLICA IDENTITY FULL;
ALTER TABLE public.bids         REPLICA IDENTITY FULL;


-- =====================================================================
--  STEP 8: VERIFY
--
--  Run this block on its own after the file completes. Every row should
--  read OK. If any reads MISSING, run the whole file again.
-- =====================================================================

SELECT 'tables' AS check_name,
       CASE WHEN count(*) = 3 THEN 'OK' ELSE 'MISSING' END AS result,
       count(*) AS found
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN ('sessions', 'participants', 'bids')

UNION ALL
SELECT 'current_round column',
       CASE WHEN count(*) = 1 THEN 'OK' ELSE 'MISSING' END,
       count(*)
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'sessions'
   AND column_name = 'current_round'

UNION ALL
SELECT 'rpc functions',
       CASE WHEN count(*) = 6 THEN 'OK' ELSE 'MISSING' END,
       count(*)
  FROM information_schema.routines
 WHERE routine_schema = 'public'
   AND routine_name IN ('join_session', 'place_bid', 'undo_last_bid',
                        'get_session_details', 'set_session_round',
                        'amount_allowed_in_round')

UNION ALL
SELECT 'rls enabled',
       CASE WHEN count(*) = 3 THEN 'OK' ELSE 'MISSING' END,
       count(*)
  FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename IN ('sessions', 'participants', 'bids')
   AND rowsecurity = true

UNION ALL
SELECT 'realtime tables',
       CASE WHEN count(*) = 3 THEN 'OK' ELSE 'MISSING' END,
       count(*)
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime'
   AND schemaname = 'public'
   AND tablename IN ('sessions', 'participants', 'bids')

UNION ALL
SELECT 'round gate',
       CASE WHEN
            public.amount_allowed_in_round(10, 1::smallint)      -- true
        AND NOT public.amount_allowed_in_round(20, 1::smallint)  -- false
        AND public.amount_allowed_in_round(20, 2::smallint)      -- true
        AND public.amount_allowed_in_round(50, 2::smallint)      -- true
        AND NOT public.amount_allowed_in_round(75, 2::smallint)  -- false
        AND public.amount_allowed_in_round(75, 3::smallint)      -- true
       THEN 'OK' ELSE 'MISSING' END,
       6;


-- =====================================================================
--  DONE
--
--  Next, in the Supabase dashboard:
--    * Settings -> API: copy the Project URL and the anon public key
--      into .env.local as NEXT_PUBLIC_SUPABASE_URL and
--      NEXT_PUBLIC_SUPABASE_ANON_KEY.
--    * Authentication -> Providers -> Email: make sure Email is enabled,
--      since the organiser signs in with a magic link.
--    * Authentication -> URL Configuration: add your site URL (and
--      http://localhost:3000 for local testing) to the redirect allow
--      list, or the magic link will bounce.
-- =====================================================================
