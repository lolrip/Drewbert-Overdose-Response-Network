-- Function to safely decrement responder count and update status
CREATE OR REPLACE FUNCTION decrement_responder_count(
  p_alert_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE alerts 
  SET responder_count = GREATEST(0, responder_count - 1),
      status = CASE 
        WHEN GREATEST(0, responder_count - 1) = 0 AND status = 'responded' THEN 'active'::alert_status
        ELSE status 
      END,
      updated_at = now()
  WHERE id = p_alert_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION decrement_responder_count(uuid) TO authenticated;

-- Function to handle response cancellation
CREATE OR REPLACE FUNCTION cancel_response_safe(
  p_alert_id uuid,
  p_responder_id uuid,
  p_reason text DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  response_exists boolean;
BEGIN
  -- Check if response exists
  SELECT EXISTS(
    SELECT 1 FROM responses 
    WHERE alert_id = p_alert_id AND responder_id = p_responder_id
  ) INTO response_exists;
  
  IF NOT response_exists THEN
    RETURN false;
  END IF;
  
  -- Delete the response
  DELETE FROM responses 
  WHERE alert_id = p_alert_id AND responder_id = p_responder_id;
  
  -- Decrement responder count and update status if needed
  PERFORM decrement_responder_count(p_alert_id);
  
  -- Log cancellation (in a real app, you might want a separate cancellations table)
  -- For now, we'll just return success
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION cancel_response_safe(uuid, uuid, text) TO authenticated;