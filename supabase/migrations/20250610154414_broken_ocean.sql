/*
  # Fix RLS policies for alerts table

  1. Problem
    - Existing policies may be checking for admin status instead of responder status
    - Need to ensure responders can view all alerts for real-time updates

  2. Solution
    - Drop all existing alert policies to avoid conflicts
    - Create new policies with correct logic for responders and admins
    - Maintain user privacy while enabling proper access

  3. Changes
    - Remove all existing policies on alerts table
    - Create new responder policy that checks is_responder = true
    - Create new admin policy that checks is_admin = true
    - Maintain user access to their own alerts
*/

-- Drop all existing policies on alerts table to avoid conflicts
DROP POLICY IF EXISTS "Responders can view all alerts" ON alerts;
DROP POLICY IF EXISTS "Admins can view all alerts" ON alerts;
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can insert own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
DROP POLICY IF EXISTS "Anonymous users can insert own alerts" ON alerts;
DROP POLICY IF EXISTS "Anonymous users can view own alerts" ON alerts;
DROP POLICY IF EXISTS "Anonymous users can update own alerts" ON alerts;

-- Create new policy for responders to view all alerts
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

-- Create policy for admins to view all alerts
CREATE POLICY "Admins can view all alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Recreate user policies for authenticated users
CREATE POLICY "Users can view own alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts"
  ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON alerts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Recreate anonymous user policies
CREATE POLICY "Anonymous users can insert own alerts"
  ON alerts
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can view own alerts"
  ON alerts
  FOR SELECT
  TO anon
  USING (user_id IS NULL AND anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can update own alerts"
  ON alerts
  FOR UPDATE
  TO anon
  USING (user_id IS NULL AND anonymous_id IS NOT NULL);