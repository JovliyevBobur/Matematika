-- Add access_code column to tests table for private/coded tests
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS access_code text DEFAULT NULL;

-- Create index for faster access code lookups
CREATE INDEX IF NOT EXISTS idx_tests_access_code ON public.tests (access_code) WHERE access_code IS NOT NULL;