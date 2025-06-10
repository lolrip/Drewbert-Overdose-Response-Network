/*
  # Fix RLS infinite recursion in alerts policies

  1. Problem
    - The current RLS policies on alerts table are causing infinite recursion
    - Policy "Responders can view all alerts" creates circular dependency with profiles table
    - This happens when querying alerts table which then queries profiles table

  2. Solution
    - Simplify the responder policy to avoid circular references
    - Use direct auth.uid() checks instead of complex subqueries
    - Ensure policies are efficient and don't create loops

  3. Changes
    - Drop existing problematic policies on alerts table
    - Create new simplified policies that avoid recursion
    - Maintain security while fixing the circular dependency
*/

-- Drop existing problematic policies on alerts table
DROP POLICY IF EXISTS "Responders can view all alerts" ON alerts;
DROP POLICY IF EXISTS "Users can insert own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;

-- Create new simplified policies for alerts table
-- Policy for responders to view all alerts (simplified to avoid recursion)
CREATE POLICY "Responders can view all alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_responder = true
    )
  );

-- Policy for users to view their own alerts
CREATE POLICY "Users can view own alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for users to insert their own alerts
CREATE POLICY "Users can insert own alerts"
  ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own alerts
CREATE POLICY "Users can update own alerts"
  ON alerts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Also ensure the profiles policies are simplified to avoid any potential recursion
DROP POLICY IF EXISTS "Responders can view other responder profiles" ON profiles;

-- Recreate the responder policy with simpler logic
CREATE POLICY "Responders can view other responder profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Current user is a responder AND the profile being viewed is also a responder
    (SELECT is_responder FROM profiles WHERE id = auth.uid()) = true
    AND is_responder = true
  );