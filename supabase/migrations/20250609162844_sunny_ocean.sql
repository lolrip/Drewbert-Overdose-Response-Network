/*
  # Fix user profile creation

  1. Changes
    - Remove the foreign key constraint that references a non-existent users table
    - Update the trigger function to properly handle new user creation
    - Ensure the profiles table can accept new user registrations

  2. Security
    - Maintain existing RLS policies
    - Ensure proper user profile creation flow
*/

-- Remove the problematic foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Update the handle_new_user function to work with the profiles table
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_responder, anonymous_id)
  VALUES (
    NEW.id,
    NEW.email,
    false,
    (gen_random_uuid())::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();