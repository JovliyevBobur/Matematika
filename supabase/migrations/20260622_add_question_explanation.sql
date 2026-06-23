-- Add explanation column to questions table
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS explanation text;

-- Update RLS policies if necessary (though usually they apply to the whole row)
