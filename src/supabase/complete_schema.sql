-- ============ COMPLETE SCHEMA WITH RPC FUNCTIONS ============
-- Run this entire script in Supabase SQL Editor

-- ============ TABLES ============
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  is_active boolean default true
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  device_id text,
  display_name text not null,
  amount numeric not null default 0,
  created_at timestamptz default now(),
  unique (session_id, user_id),
  unique (session_id, device_id)
);

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  delta numeric not null,
  created_at timestamptz default now()
);

-- ============ INDEXES ============
create index if not exists idx_sessions_code on public.sessions(code);
create index if not exists idx_sessions_active on public.sessions(is_active);
create index if not exists idx_participants_session on public.participants(session_id);
create index if not exists idx_participants_device on public.participants(device_id);
create index if not exists idx_bids_session on public.bids(session_id);

-- ============ RLS POLICIES ============

-- Enable RLS on all tables
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Simple sessions policies
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

-- Simple participants policies - allow all operations for active sessions
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

-- Simple bids policies - allow all operations for active sessions
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

-- ============ RPC FUNCTIONS ============

-- Function to join a session (create or update participant)
CREATE OR REPLACE FUNCTION join_session(
  p_session_code text,
  p_display_name text,
  p_device_id text
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
    SET display_name = p_display_name
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
    INSERT INTO participants (session_id, device_id, display_name, amount)
    VALUES (v_session_id, p_device_id, p_display_name, 0)
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

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION join_session(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION place_bid(text, text, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_session_details(text) TO anon, authenticated;
