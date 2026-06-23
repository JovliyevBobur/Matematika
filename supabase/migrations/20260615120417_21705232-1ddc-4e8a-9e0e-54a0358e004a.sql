CREATE TABLE IF NOT EXISTS public.pdf_import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject public.subject NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  access_code TEXT,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  page_count INTEGER,
  answer_keys TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  stage TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 2,
  error_message TEXT,
  error_stage TEXT,
  debug JSONB,
  result_test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
  questions_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_import_jobs TO authenticated;
GRANT ALL ON public.pdf_import_jobs TO service_role;
ALTER TABLE public.pdf_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view pdf import jobs" ON public.pdf_import_jobs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can create pdf import jobs" ON public.pdf_import_jobs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update pdf import jobs" ON public.pdf_import_jobs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER update_pdf_import_jobs_updated_at
  BEFORE UPDATE ON public.pdf_import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_pdf_import_jobs_user_created ON public.pdf_import_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_import_jobs_status_created ON public.pdf_import_jobs(status, created_at DESC);