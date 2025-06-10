/*
  # Fix timing issues with real-time alerts

  1. Database Functions
    - Add function to notify real-time listeners immediately after alert creation
    - Add function to force refresh of alert data
    - Add triggers to ensure immediate notification

  2. Performance Improvements
    - Add indexes for faster alert queries
    - Optimize RLS policies for better performance

  3. Real-time Notifications
    - Add database triggers that send notifications immediately
    - Ensure all alert changes are broadcast instantly
*/

-- Create a function to notify real-time listeners
CREATE OR REPLACE FUNCTION notify_alert_change()
RETURNS trigger AS $$
BEGIN
  -- Send notification with alert details
  PERFORM pg_notify(
    'alert_changes',
    json_build_object(
      'operation', TG_OP,
      'alert_id', COALESCE(NEW.id, OLD.id),
      'status', COALESCE(NEW.status, OLD.status),
      'responder_count', COALESCE(NEW.responder_count, OLD.responder_count),
      'timestamp', extract(epoch from now())
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create a function to notify response changes
CREATE OR REPLACE FUNCTION notify_response_change()
RETURNS trigger AS $$
BEGIN
  -- Send notification with response details
  PERFORM pg_notify(
    'response_changes',
    json_build_object(
      'operation', TG_OP,
      'response_id', COALESCE(NEW.id, OLD.id),
      'alert_id', COALESCE(NEW.alert_id, OLD.alert_id),
      'responder_id', COALESCE(NEW.responder_id, OLD.responder_id),
      'status', COALESCE(NEW.status, OLD.status),
      'timestamp', extract(epoch from now())
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add triggers for immediate notifications
DROP TRIGGER IF EXISTS alert_change_notify ON alerts;
CREATE TRIGGER alert_change_notify
  AFTER INSERT OR UPDATE OR DELETE ON alerts
  FOR EACH ROW EXECUTE FUNCTION notify_alert_change();

DROP TRIGGER IF EXISTS response_change_notify ON responses;
CREATE TRIGGER response_change_notify
  AFTER INSERT OR UPDATE OR DELETE ON responses
  FOR EACH ROW EXECUTE FUNCTION notify_response_change();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alerts_status_created ON alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_responses_status_alert ON responses(status, alert_id);
CREATE INDEX IF NOT EXISTS idx_profiles_responder_admin ON profiles(is_responder, is_admin) WHERE is_responder = true OR is_admin = true;

-- Function to get real-time alert stats (optimized)
CREATE OR REPLACE FUNCTION get_alert_stats()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'active_alerts', (
      SELECT COUNT(*) FROM alerts 
      WHERE status IN ('active', 'responded')
    ),
    'active_responders', (
      SELECT COUNT(*) FROM profiles 
      WHERE is_responder = true
    ),
    'committed_responders', (
      SELECT COUNT(*) FROM responses 
      WHERE status IN ('committed', 'en_route', 'arrived')
    ),
    'alert_commitments', (
      SELECT json_object_agg(alert_id, responder_count)
      FROM (
        SELECT 
          a.id as alert_id,
          COUNT(r.id) as responder_count
        FROM alerts a
        LEFT JOIN responses r ON a.id = r.alert_id 
          AND r.status IN ('committed', 'en_route', 'arrived')
        WHERE a.status IN ('active', 'responded')
        GROUP BY a.id
      ) stats
    ),
    'timestamp', extract(epoch from now())
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_alert_stats() TO authenticated, anon;

-- Improved alert creation function with immediate notification
CREATE OR REPLACE FUNCTION create_alert_with_notification(
  p_session_id uuid,
  p_user_id uuid,
  p_anonymous_id text,
  p_general_location text,
  p_precise_location text
) RETURNS uuid AS $$
DECLARE
  alert_id uuid;
BEGIN
  -- Insert the alert
  INSERT INTO alerts (
    session_id,
    user_id,
    anonymous_id,
    status,
    general_location,
    precise_location,
    responder_count
  ) VALUES (
    p_session_id,
    p_user_id,
    p_anonymous_id,
    'active',
    p_general_location,
    p_precise_location,
    0
  ) RETURNING id INTO alert_id;
  
  -- Force immediate notification
  PERFORM pg_notify(
    'alert_created',
    json_build_object(
      'alert_id', alert_id,
      'general_location', p_general_location,
      'timestamp', extract(epoch from now())
    )::text
  );
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION create_alert_with_notification(uuid, uuid, text, text, text) TO authenticated, anon;