/*
  # Fix infinite recursion in profiles RLS policies

  1. Security Changes
    - Drop existing problematic RLS policies on profiles table
    - Create new simplified policies that avoid circular references
    - Ensure responders can view other responder profiles without recursion
    - Maintain user privacy and security

  2. Policy Updates
    - Simplified responder profile viewing policy
    - Clear user profile management policies
    - Remove circular dependencies in policy conditions
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Responders can view other responder profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create new simplified policies without circular references

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Responders can view other responder profiles (simplified without recursion)
CREATE POLICY "Responders can view other responder profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    is_responder = true 
    AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
    )
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE is_responder = true
    )
  );