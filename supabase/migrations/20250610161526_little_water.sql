/*
  # Create get_alert_stats function

  1. New Functions
    - `get_alert_stats()` - Returns real-time statistics for responder dashboard
      - active_responders: Count of users with is_responder = true
      - committed_responders: Count of responses with active status
      - alert_commitments: JSON object mapping alert IDs to responder counts

  2. Security
    - Grant execute permissions to anonymous and authenticated users
    - Use SECURITY DEFINER for proper data access
*/

-- Drop the function if it exists to avoid return type conflicts
DROP FUNCTION IF EXISTS public.get_alert_stats();

-- Create the get_alert_stats function
CREATE OR REPLACE FUNCTION public.get_alert_stats()
RETURNS TABLE (
    active_responders bigint,
    committed_responders bigint,
    alert_commitments jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.profiles WHERE is_responder = TRUE) AS active_responders,
        (SELECT COUNT(*) FROM public.responses WHERE status IN ('committed', 'en_route', 'arrived')) AS committed_responders,
        (SELECT COALESCE(jsonb_object_agg(alert_id, responder_count), '{}'::jsonb)
            FROM (
                SELECT
                    alert_id,
                    COUNT(responder_id) AS responder_count
                FROM
                    public.responses
                WHERE
                    status IN ('committed', 'en_route', 'arrived')
                GROUP BY
                    alert_id
            ) AS subquery
        ) AS alert_commitments;
END;
$$;

-- Grant execute permissions to allow frontend calls
GRANT EXECUTE ON FUNCTION public.get_alert_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_alert_stats() TO authenticated;