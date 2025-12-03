-- Fix infinite recursion in profiles RLS policies
-- This creates a SECURITY DEFINER function that can check roles without triggering RLS

-- Drop ALL existing profiles policies to start fresh
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Superadmins can update any profile" ON profiles;

-- Create a function to check if current user is superadmin (bypasses RLS)
-- SECURITY DEFINER means it runs with the privileges of the function creator, bypassing RLS
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Directly query without RLS by using SECURITY DEFINER
  SELECT role INTO user_role
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN user_role = 'superadmin';
END;
$$;

-- Create a function to check if current user is admin or superadmin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Directly query without RLS by using SECURITY DEFINER
  SELECT role INTO user_role
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN user_role IN ('admin', 'superadmin');
END;
$$;

-- Recreate profiles SELECT policy - allow everyone to view (simple, no recursion)
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

-- Recreate profiles UPDATE policy - allow users to update own profile OR superadmins to update any
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (
    auth.uid() = id OR public.is_superadmin()
  )
  WITH CHECK (
    auth.uid() = id OR public.is_superadmin()
  );

