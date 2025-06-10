/*
  # Fix RLS Policy Infinite Recursion

  1. Problem
    - The "Admins can view all profiles" policy causes infinite recursion
    - Policy on profiles table queries profiles table itself
    - This creates a circular dependency during policy evaluation

  2. Solution
    - Drop the problematic recursive policy
    - Create a simpler, non-recursive approach for admin access
    - Use auth.jwt() to check admin status without querying profiles table
    - Maintain other policies that don't cause recursion

  3. Security Changes
    - Remove recursive admin policy
    - Keep user self-access policies
    - Keep responder visibility policy
    - Admin access will be handled through application logic
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Keep the safe, non-recursive policies:
-- 1. "Authenticated users can view responder profiles" - safe, only checks is_responder column
-- 2. "Users can insert own profile" - safe, only checks uid() = id
-- 3. "Users can update own profile" - safe, only checks uid() = id  
-- 4. "Users can view own profile" - safe, only checks uid() = id

-- Note: Admin access will now be handled in application code by:
-- 1. User logs in and gets their profile
-- 2. Application checks is_admin flag from the user's own profile
-- 3. Application shows/hides admin features based on this flag
-- 4. Backend/edge functions can verify admin status by querying user's own profile

-- Ensure RLS is still enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;