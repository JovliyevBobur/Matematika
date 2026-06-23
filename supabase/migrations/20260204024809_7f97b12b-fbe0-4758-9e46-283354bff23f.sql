-- Add is_blocked column to profiles for blocking users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

-- Create RLS policy for super admins to update any profile (for blocking)
CREATE POLICY "Super admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create RLS policy for admins to view all user roles
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.is_admin_or_super(auth.uid()));