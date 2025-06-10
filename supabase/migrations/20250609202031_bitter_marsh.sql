/*
  # Clean up duplicate data and add safety constraints

  1. Data Cleanup
    - Remove duplicate responses (keep most recent per alert/responder pair)
    - Remove duplicate alerts (keep most recent per user/location/time)
    - Remove duplicate active monitoring sessions

  2. Database Constraints
    - Add unique constraint for responses
    - Add unique indexes for active monitoring sessions

  3. Safety Functions
    - Safe response creation with duplicate handling
    - Safe responder count increment
    - Safe monitoring session ending
*/

-- Clean up duplicate responses (keep most recent)
WITH ranked_responses AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY alert_id, responder_id 
           ORDER BY created_at DESC
         ) as rn
  FROM responses
),
duplicates_to_delete AS (
  SELECT id 
  FROM ranked_responses 
  WHERE rn > 1
)
DELETE FROM responses 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Clean up duplicate alerts (keep most recent for same user/location/time)
WITH ranked_alerts AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY 
             COALESCE(user_id::text, anonymous_id),
             general_location,
             DATE_TRUNC('minute', created_at)
           ORDER BY created_at DESC
         ) as rn
  FROM alerts
),
alert_duplicates_to_delete AS (
  SELECT id 
  FROM ranked_alerts 
  WHERE rn > 1
)
DELETE FROM alerts 
WHERE id IN (SELECT id FROM alert_duplicates_to_delete);

-- Clean up duplicate ACTIVE monitoring sessions for users (keep most recent)
WITH ranked_active_user_sessions AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY started_at DESC
         ) as rn
  FROM monitoring_sessions
  WHERE status = 'active' AND user_id IS NOT NULL
),
user_session_duplicates_to_delete AS (
  SELECT id 
  FROM ranked_active_user_sessions 
  WHERE rn > 1
)
DELETE FROM monitoring_sessions 
WHERE id IN (SELECT id FROM user_session_duplicates_to_delete);

-- Clean up duplicate ACTIVE monitoring sessions for anonymous users (keep most recent)
WITH ranked_active_anon_sessions AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY anonymous_id
           ORDER BY started_at DESC
         ) as rn
  FROM monitoring_sessions
  WHERE status = 'active' AND anonymous_id IS NOT NULL
),
anon_session_duplicates_to_delete AS (
  SELECT id 
  FROM ranked_active_anon_sessions 
  WHERE rn > 1
)
DELETE FROM monitoring_sessions 
WHERE id IN (SELECT id FROM anon_session_duplicates_to_delete);

-- Clean up any remaining duplicate monitoring sessions by time
WITH ranked_sessions AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY 
             COALESCE(user_id::text, anonymous_id),
             DATE_TRUNC('minute', started_at)
           ORDER BY started_at DESC
         ) as rn
  FROM monitoring_sessions
),
session_duplicates_to_delete AS (
  SELECT id 
  FROM ranked_sessions 
  WHERE rn > 1
)
DELETE FROM monitoring_sessions 
WHERE id IN (SELECT id FROM session_duplicates_to_delete);

-- Add/update unique constraints for responses
ALTER TABLE responses 
DROP CONSTRAINT IF EXISTS responses_alert_responder_unique;

ALTER TABLE responses 
ADD CONSTRAINT responses_alert_responder_unique 
UNIQUE (alert_id, responder_id);

-- Now create unique indexes for active monitoring sessions
-- (duplicates have been cleaned up above)
DROP INDEX IF EXISTS idx_monitoring_sessions_active_user;
CREATE UNIQUE INDEX idx_monitoring_sessions_active_user
ON monitoring_sessions (user_id) 
WHERE status = 'active' AND user_id IS NOT NULL;

DROP INDEX IF EXISTS idx_monitoring_sessions_active_anonymous;
CREATE UNIQUE INDEX idx_monitoring_sessions_active_anonymous
ON monitoring_sessions (anonymous_id) 
WHERE status = 'active' AND anonymous_id IS NOT NULL;

-- Drop existing functions first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS create_response_safe(uuid, uuid, response_status);
DROP FUNCTION IF EXISTS increment_responder_count(uuid);
DROP FUNCTION IF EXISTS end_monitoring_session_safe(uuid, monitoring_status);

-- Create function for safe response creation
CREATE FUNCTION create_response_safe(
  p_alert_id uuid,
  p_responder_id uuid,
  p_status response_status DEFAULT 'committed'
) RETURNS uuid AS $$
DECLARE
  response_id uuid;
  existing_response_id uuid;
BEGIN
  -- Check if response already exists
  SELECT id INTO existing_response_id
  FROM responses 
  WHERE alert_id = p_alert_id AND responder_id = p_responder_id;
  
  IF existing_response_id IS NOT NULL THEN
    -- Return existing response ID
    RETURN existing_response_id;
  END IF;
  
  -- Create new response
  INSERT INTO responses (alert_id, responder_id, status)
  VALUES (p_alert_id, p_responder_id, p_status)
  RETURNING id INTO response_id;
  
  RETURN response_id;
EXCEPTION
  WHEN unique_violation THEN
    -- If unique constraint violation (race condition), return existing ID
    SELECT id INTO existing_response_id
    FROM responses 
    WHERE alert_id = p_alert_id AND responder_id = p_responder_id;
    
    RETURN existing_response_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to safely increment responder count
CREATE FUNCTION increment_responder_count(
  p_alert_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE alerts 
  SET responder_count = responder_count + 1,
      status = CASE 
        WHEN status = 'active' THEN 'responded'::alert_status
        ELSE status 
      END,
      updated_at = now()
  WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to safely end monitoring session
CREATE FUNCTION end_monitoring_session_safe(
  p_session_id uuid,
  p_status monitoring_status DEFAULT 'completed'
) RETURNS void AS $$
BEGIN
  UPDATE monitoring_sessions 
  SET status = p_status,
      ended_at = COALESCE(ended_at, now())
  WHERE id = p_session_id 
    AND ended_at IS NULL; -- Only update if not already ended
END;
$$ LANGUAGE plpgsql;