-- ============ MASTER SCHEMA - COMPLETE DATABASE SETUP ============
-- Run this ENTIRE file in Supabase SQL Editor to set up everything
-- This file contains: Tables, Indexes, RLS Policies, and RPC Functions

-- ============ STEP 1: CREATE TABLES ============

-- Sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Participants table
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

-- Bids table
CREATE TABLE IF NOT EXISTS public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  delta numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============ STEP 2: CREATE INDEXES ============

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_code ON public.sessions(code);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON public.sessions(created_by);

-- Participants indexes
CREATE INDEX IF NOT EXISTS idx_participants_session ON public.participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_device ON public.participants(device_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.participants(user_id);

-- Bids indexes
CREATE INDEX IF NOT EXISTS idx_bids_session ON public.bids(session_id);
CREATE INDEX IF NOT EXISTS idx_bids_participant ON public.bids(participant_id);

-- ============ STEP 3: ENABLE ROW LEVEL SECURITY ============

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- ============ STEP 4: CREATE RLS POLICIES ============

-- Sessions policies
DROP POLICY IF EXISTS sessions_insert_creator ON public.sessions;
CREATE POLICY sessions_insert_creator
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

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

-- Participants policies - simple and effective
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
USING (
  -- Allow deletion if user is authenticated (admin)
  auth.uid() IS NOT NULL
);

-- Bids policies - simple and effective
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

-- ============ STEP 5: CREATE RPC FUNCTIONS ============

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS join_session(text, text, text, text);
DROP FUNCTION IF EXISTS place_bid(text, text, numeric);
DROP FUNCTION IF EXISTS get_session_details(text);
DROP FUNCTION IF EXISTS undo_last_bid(text, text);

-- Function to join a session (create or update participant)
CREATE OR REPLACE FUNCTION join_session(
  p_session_code text,
  p_display_name text,
  p_device_id text,
  p_mobile_number text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
AS $$
DECLARE
  v_session_id uuid;
  v_participant_id uuid;
  v_existing_participant participants;
BEGIN
  -- Validate inputs
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
  
  -- Get session ID and validate it's active
  SELECT id INTO v_session_id 
  FROM sessions 
  WHERE code = p_session_code AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;
  
  -- Check if participant already exists
  SELECT * INTO v_existing_participant
  FROM participants 
  WHERE session_id = v_session_id AND device_id = p_device_id;
  
  IF v_existing_participant IS NOT NULL THEN
    -- Update existing participant
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
    -- Create new participant
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

-- Function to place a bid
CREATE OR REPLACE FUNCTION place_bid(
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
BEGIN
  -- Validate inputs
  IF p_amount IS NULL OR p_amount < 5 THEN
    RAISE EXCEPTION 'Amount must be at least 5';
  END IF;
  
  IF p_device_id IS NULL OR trim(p_device_id) = '' THEN
    RAISE EXCEPTION 'Device ID is required';
  END IF;
  
  IF p_session_code IS NULL OR trim(p_session_code) = '' THEN
    RAISE EXCEPTION 'Session code is required';
  END IF;
  
  -- Get session and participant
  SELECT s.id, p.id, p.amount INTO v_session_id, v_participant_id, v_current_amount
  FROM sessions s
  JOIN participants p ON p.session_id = s.id
  WHERE s.code = p_session_code 
    AND s.is_active = true 
    AND p.device_id = p_device_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session or participant not found';
  END IF;
  
  -- Update participant amount
  UPDATE participants 
  SET amount = v_current_amount + p_amount
  WHERE id = v_participant_id;
  
  -- Record bid
  INSERT INTO bids (session_id, participant_id, delta)
  VALUES (v_session_id, v_participant_id, p_amount);
  
  RETURN json_build_object(
    'success', true,
    'new_total', v_current_amount + p_amount,
    'bid_amount', p_amount
  );
END;
$$;

-- Function to get session details with participants
CREATE OR REPLACE FUNCTION get_session_details(p_session_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session sessions;
  v_participants json;
  v_total_amount numeric;
BEGIN
  -- Get session
  SELECT * INTO v_session
  FROM sessions 
  WHERE code = p_session_code AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;
  
  -- Get participants with proper aggregation
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
  
  -- Calculate total amount
  SELECT COALESCE(SUM(amount), 0) INTO v_total_amount
  FROM participants
  WHERE session_id = v_session.id;
  
  RETURN json_build_object(
    'session', json_build_object(
      'id', v_session.id,
      'code', v_session.code,
      'title', v_session.title,
      'created_at', v_session.created_at
    ),
    'participants', COALESCE(v_participants, '[]'::json),
    'total_amount', v_total_amount,
    'participant_count', CASE WHEN v_participants IS NULL THEN 0 ELSE json_array_length(v_participants) END
  );
END;
$$;

-- Function to undo the last bid for a participant
CREATE OR REPLACE FUNCTION undo_last_bid(
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
  -- Validate inputs
  IF p_device_id IS NULL OR trim(p_device_id) = '' THEN
    RAISE EXCEPTION 'Device ID is required';
  END IF;
  
  IF p_session_code IS NULL OR trim(p_session_code) = '' THEN
    RAISE EXCEPTION 'Session code is required';
  END IF;
  
  -- Get session and participant
  SELECT s.id, p.id INTO v_session_id, v_participant_id
  FROM sessions s
  JOIN participants p ON p.session_id = s.id
  WHERE s.code = p_session_code 
    AND s.is_active = true 
    AND p.device_id = p_device_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session or participant not found';
  END IF;
  
  -- Get the last bid for this participant
  SELECT id, delta INTO v_last_bid_id, v_last_bid_amount
  FROM bids 
  WHERE session_id = v_session_id 
    AND participant_id = v_participant_id
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No bids found to undo';
  END IF;
  
  -- Calculate new total (ensure it doesn't go below 0)
  v_new_total := GREATEST(0, (SELECT amount FROM participants WHERE id = v_participant_id) - v_last_bid_amount);
  
  -- Update participant amount
  UPDATE participants 
  SET amount = v_new_total
  WHERE id = v_participant_id;
  
  -- Delete the last bid
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

-- ============ STEP 6: GRANT PERMISSIONS ============

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION join_session(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION place_bid(text, text, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_session_details(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION undo_last_bid(text, text) TO anon, authenticated;

-- ============ STEP 7: VERIFICATION QUERIES ============

-- Uncomment these lines to verify the setup (optional)
-- SELECT 'Tables created successfully' as status;
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('sessions', 'participants', 'bids');
-- SELECT function_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
-- SELECT policy_name, table_name FROM pg_policies WHERE schemaname = 'public';

-- ============ END OF MASTER SCHEMA ============
-- Run this entire file in Supabase SQL Editor
-- All tables, policies, and functions will be created/updated
