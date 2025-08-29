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
