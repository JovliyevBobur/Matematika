
-- Fix security issue 1: Profiles public RLS - restrict to authenticated users
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- This ensures only logged-in users can see profiles, not anonymous/unauthenticated
