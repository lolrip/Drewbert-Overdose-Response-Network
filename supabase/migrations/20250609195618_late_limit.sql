/*
  # Add admin RLS policies

  1. Security
    - Add RLS policies that allow admin users to view all alerts and responses
    - Ensure data privacy while enabling admin reporting functionality
*/

-- Allow admins to view all alerts
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

-- Allow admins to view all responses  
CREATE POLICY "Admins can view all responses"
  ON responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Allow admins to view all monitoring sessions
CREATE POLICY "Admins can view all monitoring sessions"
  ON monitoring_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Allow admins to view all profiles (for user management)
CREATE POLICY "Admins can view all profiles" 
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.is_admin = true
    )
  );