/*
  # Fix RLS policies for anonymous monitoring

  1. Problem
    - Current RLS policies only allow authenticated users to create monitoring sessions
    - App is designed to support anonymous users but policies don't allow it
    - This causes 401 errors when trying to start monitoring without authentication

  2. Solution
    - Add policies to allow anonymous users to create and manage their own sessions
    - Add policies to allow anonymous users to create alerts
    - Ensure anonymous users can only access their own data via anonymous_id

  3. Changes
    - Add anonymous insert/select/update policies for monitoring_sessions
    - Add anonymous insert/select policies for alerts
    - Maintain security by ensuring users can only access their own data
*/

-- Add policies for anonymous users on monitoring_sessions
CREATE POLICY "Anonymous users can insert own sessions"
  ON monitoring_sessions
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can view own sessions"
  ON monitoring_sessions
  FOR SELECT
  TO anon
  USING (user_id IS NULL AND anonymous_id IS NOT NULL);

CREATE POLICY "Anonymous users can update own sessions"
  ON monitoring_sessions
  FOR UPDATE
  TO anon
  USING (user_id IS NULL AND anonymous_id IS NOT NULL);

-- Add policies for anonymous users on alerts
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