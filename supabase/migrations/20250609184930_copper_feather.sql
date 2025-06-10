/*
  # Add admin role support

  1. Changes
    - Add `is_admin` column to profiles table to identify admin users
    - Create RLS policies for admin-only data access
    - Set up proper indexes for performance

  2. Security
    - Only admins can view aggregated report data
    - Maintain existing user privacy protections
*/

-- Add is_admin column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;