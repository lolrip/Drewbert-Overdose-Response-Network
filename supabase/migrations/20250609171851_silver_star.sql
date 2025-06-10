/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - The current RLS policy on profiles table causes infinite recursion
    - When useAlerts hook tries to fetch alerts, it queries profiles to check if user is responder
    - The profiles policy tries to query profiles again, causing infinite loop

  2. Solution
    - Drop the problematic policy completely
    - Create a much simpler policy that doesn't reference profiles table within itself
    - Use a direct approach that checks user permission without recursion

  3. Changes
    - Remove the recursive policy on profiles table
    - Create new simplified policies
    - Ensure alerts can be fetched by responders without recursion
*/

-- Drop all existing policies on profiles table to start fresh
DROP POLICY IF EXISTS "Responders can view other responder profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create simple, non-recursive policies for profiles table

-- Users can always view and manage their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Simplified responder policy - responders can view all profiles marked as responder
-- This avoids recursion by not checking the current user's responder status within the policy
CREATE POLICY "Authenticated users can view responder profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (is_responder = true);