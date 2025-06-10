/*
  # Create increment_responder_count function

  1. New Functions
    - `increment_responder_count(alert_id uuid)`
      - Increments the responder_count for a specific alert
      - Updates alert status to 'responded'
      - Creates a response record for the responder
  
  2. Security
    - Grant execute permissions to authenticated users
    - Function uses security definer for proper access control
*/

CREATE OR REPLACE FUNCTION public.increment_responder_count(alert_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the alert's responder count and status
  UPDATE public.alerts
  SET
    responder_count = responder_count + 1,
    status = 'responded'::alert_status,
    updated_at = now()
  WHERE id = alert_id;
  
  -- Create a response record for this responder
  INSERT INTO public.responses (alert_id, responder_id, status)
  VALUES (alert_id, auth.uid(), 'committed'::response_status);
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_responder_count(uuid) TO authenticated;