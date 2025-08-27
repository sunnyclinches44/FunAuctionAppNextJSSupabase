-- Migration: Add mobile_number field to participants table
-- Run this in Supabase SQL Editor to add mobile number functionality

-- Add mobile_number column to participants table
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS mobile_number text;

-- Add comment for documentation
COMMENT ON COLUMN public.participants.mobile_number IS 'Mobile number of the participant (mandatory field)';

-- Create index for mobile number queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_participants_mobile ON public.participants(mobile_number);

-- Update the join_session RPC function to include mobile number
-- First, drop the existing function if it exists
DROP FUNCTION IF EXISTS public.join_session(text, text, text);

-- Create the updated join_session function with mobile number
CREATE OR REPLACE FUNCTION public.join_session(
  p_session_code text,
  p_display_name text,
  p_device_id text,
  p_mobile_number text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_participant_id uuid;
BEGIN
  -- Get session ID from code
  SELECT id INTO v_session_id
  FROM public.sessions
  WHERE code = p_session_code AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or inactive';
  END IF;
  
  -- Check if mobile number is provided (mandatory)
  IF p_mobile_number IS NULL OR trim(p_mobile_number) = '' THEN
    RAISE EXCEPTION 'Mobile number is required';
  END IF;
  
  -- Check if participant already exists
  SELECT id INTO v_participant_id
  FROM public.participants
  WHERE session_id = v_session_id AND device_id = p_device_id;
  
  IF FOUND THEN
    -- Update existing participant
    UPDATE public.participants
    SET 
      display_name = p_display_name,
      mobile_number = p_mobile_number,
      created_at = now()
    WHERE id = v_participant_id;
  ELSE
    -- Insert new participant
    INSERT INTO public.participants (
      session_id,
      device_id,
      display_name,
      mobile_number,
      amount
    ) VALUES (
      v_session_id,
      p_device_id,
      p_display_name,
      p_mobile_number,
      0
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.join_session(text, text, text, text) TO authenticated, anon;

-- Make mobile_number NOT NULL after ensuring all existing records have a value
-- For existing records without mobile number, set a default value
UPDATE public.participants 
SET mobile_number = 'N/A' 
WHERE mobile_number IS NULL OR trim(mobile_number) = '';

-- Now make the column NOT NULL
ALTER TABLE public.participants 
ALTER COLUMN mobile_number SET NOT NULL;

-- Add a check constraint to ensure mobile number is not empty
ALTER TABLE public.participants 
ADD CONSTRAINT check_mobile_number_not_empty 
CHECK (trim(mobile_number) != '');
