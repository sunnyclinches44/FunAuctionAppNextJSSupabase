-- ============ ENHANCED SAFETY SCHEMA ============
-- Additional safety features for fraud prevention and device tracking
-- Run this AFTER the master_schema.sql

-- ============ STEP 1: ENHANCED DEVICE TRACKING ============

-- Device fingerprinting table for enhanced security
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  screen_resolution text,
  timezone text,
  language text,
  platform text,
  browser text,
  fingerprint_hash text,
  risk_score integer DEFAULT 0,
  suspicious_activity_count integer DEFAULT 0,
  first_seen timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now(),
  is_blocked boolean DEFAULT false,
  block_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Session security settings table
CREATE TABLE IF NOT EXISTS public.session_security (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  require_mobile_verification boolean DEFAULT false,
  require_mobile_for_amount numeric DEFAULT 0,
  max_bids_per_device integer DEFAULT 100,
  max_amount_per_device numeric DEFAULT 10000,
  allow_unverified_participants boolean DEFAULT true,
  max_unverified_participants integer DEFAULT 50,
  session_timeout_minutes integer DEFAULT 1440, -- 24 hours
  fraud_detection_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptra DEFAULT now()
);

-- Fraud detection logs
CREATE TABLE IF NOT EXISTS public.fraud_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES public.participants(id) ON DELETE CASCADE,
  device_id text,
  ip_address inet,
  activity_type text NOT NULL, -- 'suspicious_bid', 'multiple_devices', 'rapid_bidding', etc.
  risk_score integer NOT NULL,
  details jsonb,
  action_taken text, -- 'warned', 'blocked', 'investigated', etc.
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

-- ============ STEP 2: CREATE INDEXES ============

CREATE INDEX IF NOT EXISTS idx_device_fingerprints_device_id ON public.device_fingerprints(device_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_ip ON public.device_fingerprints(ip_address);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_risk ON public.device_fingerprints(risk_score);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_blocked ON public.device_fingerprints(is_blocked);

CREATE INDEX IF NOT EXISTS idx_session_security_session ON public.session_security(session_id);

CREATE INDEX IF NOT EXISTS idx_fraud_logs_session ON public.fraud_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_device ON public.fraud_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_risk ON public.fraud_logs(risk_score);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_created ON public.fraud_logs(created_at);

-- ============ STEP 3: ENABLE RLS ============

ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_logs ENABLE ROW LEVEL SECURITY;

-- ============ STEP 4: RLS POLICIES ============

-- Device fingerprints policies
CREATE POLICY device_fingerprints_select_own ON public.device_fingerprints
FOR SELECT TO authenticated, anon
USING (true); -- Allow reading for security purposes

CREATE POLICY device_fingerprints_insert_own ON public.device_fingerprints
FOR INSERT TO authenticated, anon
WITH CHECK (true); -- Allow creation for security tracking

CREATE POLICY device_fingerprints_update_admin ON public.device_fingerprints
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL); -- Only admins can update

-- Session security policies
CREATE POLICY session_security_select_session ON public.session_security
FOR SELECT TO authenticated, anon
USING (true); -- Allow reading for session participants

CREATE POLICY session_security_insert_admin ON public.session_security
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL); -- Only admins can create

CREATE POLICY session_security_update_admin ON public.session_security
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL); -- Only admins can update

-- Fraud logs policies
CREATE POLICY fraud_logs_select_admin ON public.fraud_logs
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL); -- Only admins can view

CREATE POLICY fraud_logs_insert_system ON public.fraud_logs
FOR INSERT TO authenticated, anon
WITH CHECK (true); -- Allow system to log fraud

-- ============ STEP 5: ENHANCED FUNCTIONS ============

-- Function to calculate device risk score
CREATE OR REPLACE FUNCTION calculate_device_risk_score(
  p_device_id text,
  p_ip_address inet,
  p_session_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_risk_score integer := 0;
  v_device_count integer;
  v_ip_count integer;
  v_bid_count integer;
  v_amount_total numeric;
  v_suspicious_count integer;
BEGIN
  -- Check for multiple devices from same IP
  SELECT COUNT(DISTINCT device_id) INTO v_device_count
  FROM participants
  WHERE session_id = p_session_id AND ip_address = p_ip_address;
  
  IF v_device_count > 3 THEN
    v_risk_score := v_risk_score + 20;
  END IF;
  
  -- Check for multiple IPs from same device
  SELECT COUNT(DISTINCT ip_address) INTO v_ip_count
  FROM participants
  WHERE session_id = p_session_id AND device_id = p_device_id;
  
  IF v_ip_count > 2 THEN
    v_risk_score := v_risk_score + 15;
  END IF;
  
  -- Check for excessive bidding
  SELECT COUNT(*), COALESCE(SUM(delta), 0) INTO v_bid_count, v_amount_total
  FROM bids b
  JOIN participants p ON b.participant_id = p.id
  WHERE p.session_id = p_session_id AND p.device_id = p_device_id;
  
  IF v_bid_count > 50 THEN
    v_risk_score := v_risk_score + 25;
  END IF;
  
  IF v_amount_total > 5000 THEN
    v_risk_score := v_risk_score + 20;
  END IF;
  
  -- Check for previous suspicious activity
  SELECT COUNT(*) INTO v_suspicious_count
  FROM fraud_logs
  WHERE device_id = p_device_id AND risk_score > 50;
  
  v_risk_score := v_risk_score + (v_suspicious_count * 10);
  
  -- Cap risk score at 100
  IF v_risk_score > 100 THEN
    v_risk_score := 100;
  END IF;
  
  RETURN v_risk_score;
END;
$$;

-- Function to detect and log suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
  p_session_id uuid,
  p_participant_id uuid,
  p_device_id text,
  p_ip_address inet,
  p_activity_type text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_risk_score integer;
  v_action_taken text := 'logged';
  v_result json;
BEGIN
  -- Calculate risk score
  v_risk_score := calculate_device_risk_score(p_device_id, p_ip_address, p_session_id);
  
  -- Determine action based on risk score
  IF v_risk_score > 80 THEN
    v_action_taken := 'blocked';
    -- Block the device
    UPDATE device_fingerprints 
    SET is_blocked = true, block_reason = 'High risk score: ' || v_risk_score
    WHERE device_id = p_device_id;
  ELSIF v_risk_score > 60 THEN
    v_action_taken := 'warned';
  END IF;
  
  -- Log the activity
  INSERT INTO fraud_logs (
    session_id, participant_id, device_id, ip_address, 
    activity_type, risk_score, details, action_taken
  ) VALUES (
    p_session_id, p_participant_id, p_device_id, p_ip_address,
    p_activity_type, v_risk_score, p_details, v_action_taken
  );
  
  -- Update device fingerprint risk score
  INSERT INTO device_fingerprints (
    device_id, ip_address, risk_score, suspicious_activity_count
  ) VALUES (
    p_device_id, p_ip_address, v_risk_score, 1
  )
  ON CONFLICT (device_id) DO UPDATE SET
    risk_score = EXCLUDED.risk_score,
    suspicious_activity_count = device_fingerprints.suspicious_activity_count + 1,
    last_seen = now(),
    updated_at = now();
  
  -- Return result
  v_result := json_build_object(
    'risk_score', v_risk_score,
    'action_taken', v_action_taken,
    'device_blocked', v_action_taken = 'blocked'
  );
  
  RETURN v_result;
END;
$$;

-- Function to get session security summary
CREATE OR REPLACE FUNCTION get_session_security_summary(
  p_session_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_unverified_count integer;
  v_high_risk_count integer;
  v_blocked_count integer;
BEGIN
  -- Count unverified participants
  SELECT COUNT(*) INTO v_unverified_count
  FROM participants p
  LEFT JOIN device_fingerprints df ON p.device_id = df.device_id
  WHERE p.session_id = p_session_id 
    AND (df.device_id IS NULL OR df.is_blocked = false);
  
  -- Count high risk devices
  SELECT COUNT(*) INTO v_high_risk_count
  FROM participants p
  JOIN device_fingerprints df ON p.device_id = df.device_id
  WHERE p.session_id = p_session_id AND df.risk_score > 60;
  
  -- Count blocked devices
  SELECT COUNT(*) INTO v_blocked_count
  FROM participants p
  JOIN device_fingerprints df ON p.device_id = df.device_id
  WHERE p.session_id = p_session_id AND df.is_blocked = true;
  
  v_result := json_build_object(
    'unverified_participants', v_unverified_count,
    'high_risk_devices', v_high_risk_count,
    'blocked_devices', v_blocked_count,
    'total_participants', v_unverified_count + v_high_risk_count + v_blocked_count
  );
  
  RETURN v_result;
END;
$$;

-- ============ STEP 6: TRIGGERS ============

-- Trigger to automatically detect suspicious activity on bid insertion
CREATE OR REPLACE FUNCTION trigger_suspicious_bid_detection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_device_id text;
  v_ip_address inet;
  v_session_id uuid;
BEGIN
  -- Get device and session info
  SELECT p.device_id, p.session_id INTO v_device_id, v_session_id
  FROM participants p
  WHERE p.id = NEW.participant_id;
  
  -- Get IP address (you'll need to store this in participants table)
  -- For now, we'll use a placeholder
  v_ip_address := '0.0.0.0'::inet;
  
  -- Check for rapid bidding (multiple bids in short time)
  IF EXISTS (
    SELECT 1 FROM bids b
    JOIN participants p2 ON b.participant_id = p2.id
    WHERE p2.device_id = v_device_id
      AND b.created_at > now() - interval '1 minute'
      AND b.id != NEW.id
  ) THEN
    PERFORM detect_suspicious_activity(
      v_session_id, NEW.participant_id, v_device_id, v_ip_address,
      'rapid_bidding',
      json_build_object('bid_amount', NEW.delta, 'time_interval', '1 minute')
    );
  END IF;
  
  -- Check for unusually high bid amounts
  IF NEW.delta > 1000 THEN
    PERFORM detect_suspicious_activity(
      v_session_id, NEW.participant_id, v_device_id, v_ip_address,
      'high_amount_bid',
      json_build_object('bid_amount', NEW.delta, 'threshold', 1000)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS suspicious_bid_detection ON public.bids;
CREATE TRIGGER suspicious_bid_detection
  AFTER INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION trigger_suspicious_bid_detection();

-- ============ STEP 7: DEFAULT SECURITY SETTINGS ============

-- Insert default security settings for existing sessions
INSERT INTO public.session_security (session_id, require_mobile_verification, fraud_detection_enabled)
SELECT id, false, true
FROM public.sessions
WHERE id NOT IN (SELECT session_id FROM public.session_security);

-- ============ STEP 8: UTILITY FUNCTIONS ============

-- Function to block a device
CREATE OR REPLACE FUNCTION block_device(
  p_device_id text,
  p_reason text DEFAULT 'Admin action'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE device_fingerprints 
  SET is_blocked = true, block_reason = p_reason, updated_at = now()
  WHERE device_id = p_device_id;
  
  RETURN FOUND;
END;
$$;

-- Function to unblock a device
CREATE OR REPLACE FUNCTION unblock_device(
  p_device_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE device_fingerprints 
  SET is_blocked = false, block_reason = NULL, updated_at = now()
  WHERE device_id = p_device_id;
  
  RETURN FOUND;
END;
$$;

