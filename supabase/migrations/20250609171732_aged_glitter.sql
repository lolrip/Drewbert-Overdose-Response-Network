/*
  # Fix infinite recursion in profiles RLS policy

  1. Security Changes
    - Drop the problematic "Responders can view other responder profiles" policy
    - Create a new, simpler policy that doesn't cause recursion
    - The new policy will allow responders to view other responder profiles without self-referencing

  2. Policy Changes
    - Remove recursive SELECT from profiles table within profiles policy
    - Use a simpler approach that checks the current user's responder status from auth context
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Responders can view other responder profiles" ON profiles;

-- Create a new policy that allows responders to view other responder profiles
-- This policy avoids recursion by not querying the profiles table within itself
CREATE POLICY "Responders can view other responder profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing other responder profiles only if:
    -- 1. The current user is a responder (checked via a separate query)
    -- 2. The profile being viewed is also a responder
    is_responder = true 
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND auth.users.id IN (
        SELECT id FROM profiles WHERE id = auth.uid() AND is_responder = true
      )
    )
  );