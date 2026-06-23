-- Add new subjects to the subject enum
ALTER TYPE public.subject ADD VALUE IF NOT EXISTS 'chemistry';
ALTER TYPE public.subject ADD VALUE IF NOT EXISTS 'biology';
ALTER TYPE public.subject ADD VALUE IF NOT EXISTS 'informatics';