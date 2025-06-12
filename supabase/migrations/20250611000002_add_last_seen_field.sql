-- Add last_seen_at timestamp to profiles table for tracking online responders
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NULL;

-- Create an index on last_seen_at for faster queries
CREATE INDEX IF NOT EXISTS profiles_last_seen_idx ON profiles (last_seen_at);

-- Create a function to get online responder count
CREATE OR REPLACE FUNCTION get_online_responder_count()
RETURNS TABLE(online_responder_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT COUNT(*)::bigint 
    FROM profiles
    WHERE 
      is_responder = true AND
      last_seen_at IS NOT NULL AND
      last_seen_at > (NOW() - INTERVAL '5 minutes');
END;
$$;

-- Update the get_alert_stats function to include online responders
CREATE OR REPLACE FUNCTION get_alert_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  WITH 
    active_responders AS (
      SELECT COUNT(*) AS count
      FROM profiles
      WHERE 
        is_responder = true AND
        last_seen_at IS NOT NULL AND
        last_seen_at > (NOW() - INTERVAL '5 minutes')
    ),
    committed_responders AS (
      SELECT COUNT(*) AS count
      FROM responses
      WHERE status IN ('committed', 'en_route', 'arrived')
    ),
    alert_commitments AS (
      SELECT 
        alert_id,
        COUNT(*) AS responder_count
      FROM responses
      WHERE status IN ('committed', 'en_route', 'arrived')
      GROUP BY alert_id
    )
    
  SELECT 
    json_build_object(
      'active_responders', (SELECT count FROM active_responders),
      'committed_responders', (SELECT count FROM committed_responders),
      'alert_commitments', (
        SELECT 
          COALESCE(
            json_object_agg(alert_id, responder_count),
            '{}'::json
          )
        FROM alert_commitments
      )
    ) INTO result;
    
  RETURN result;
END;
$$;
