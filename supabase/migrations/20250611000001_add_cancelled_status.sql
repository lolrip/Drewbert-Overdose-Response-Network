-- Add cancelled status to alert_status enum and create response_cancellations table

-- Add cancelled status to the alert_status enum
ALTER TYPE alert_status ADD VALUE 'cancelled';

-- Create table to track response cancellations for better UX
CREATE TABLE IF NOT EXISTS response_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES alerts(id) NOT NULL,
  responder_id uuid REFERENCES profiles(id) NOT NULL,
  reason text NOT NULL,
  details text,
  cancelled_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE response_cancellations ENABLE ROW LEVEL SECURITY;

-- Policies for response_cancellations
CREATE POLICY "Responders can view cancellations for alerts they can see"
  ON response_cancellations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM alerts 
      WHERE id = alert_id 
      AND status IN ('active', 'responded', 'cancelled')
    )
  );

CREATE POLICY "Responders can insert their own cancellations"
  ON response_cancellations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = responder_id);

-- Update the cancel_response_safe function to track cancellations and set alert status to cancelled if no responders left
CREATE OR REPLACE FUNCTION cancel_response_safe(
  p_alert_id uuid,
  p_responder_id uuid,
  p_reason text DEFAULT NULL
) RETURNS boolean AS $$
DECLARE
  response_exists boolean;
  remaining_responses integer;
BEGIN
  -- Check if response exists
  SELECT EXISTS(
    SELECT 1 FROM responses 
    WHERE alert_id = p_alert_id AND responder_id = p_responder_id
  ) INTO response_exists;
  
  IF NOT response_exists THEN
    RETURN false;
  END IF;
  
  -- Log the cancellation before deleting the response
  INSERT INTO response_cancellations (alert_id, responder_id, reason)
  VALUES (p_alert_id, p_responder_id, COALESCE(p_reason, 'No reason provided'));
  
  -- Delete the response
  DELETE FROM responses 
  WHERE alert_id = p_alert_id AND responder_id = p_responder_id;
  
  -- Decrement responder count
  PERFORM decrement_responder_count(p_alert_id);
  
  -- Check if there are any remaining committed responses for this alert
  SELECT COUNT(*) INTO remaining_responses
  FROM responses 
  WHERE alert_id = p_alert_id AND status IN ('committed', 'en_route', 'arrived');
  
  -- If no committed responders remain, mark the alert as cancelled
  IF remaining_responses = 0 THEN
    UPDATE alerts 
    SET status = 'cancelled'::alert_status,
        updated_at = now()
    WHERE id = p_alert_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION cancel_response_safe(uuid, uuid, text) TO authenticated;
