/*
  # Fix get_alert_stats function return type

  1. Changes
    - Drop existing function with conflicting return type
    - Create new function that returns JSON object as expected by frontend
    - Ensure proper permissions are granted

  2. Function Returns
    - active_responders: number of responders
    - committed_responders: number of committed responses  
    - alert_commitments: object mapping alert IDs to responder counts
*/

-- Drop the function if it exists to avoid return type conflicts
DROP FUNCTION IF EXISTS public.get_alert_stats();

-- Create the get_alert_stats function that returns a JSON object
CREATE OR REPLACE FUNCTION public.get_alert_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'active_responders', (
            SELECT COUNT(*) FROM public.profiles WHERE is_responder = TRUE
        ),
        'committed_responders', (
            SELECT COUNT(*) FROM public.responses WHERE status IN ('committed', 'en_route', 'arrived')
        ),
        'alert_commitments', (
            SELECT COALESCE(jsonb_object_agg(alert_id, responder_count), '{}'::jsonb)
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
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Grant execute permissions to allow frontend calls
GRANT EXECUTE ON FUNCTION public.get_alert_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_alert_stats() TO authenticated;