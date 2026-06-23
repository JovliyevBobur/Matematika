
-- Delete non-math content
DELETE FROM public.tests WHERE subject <> 'math';
DELETE FROM public.pdf_import_jobs WHERE subject <> 'math';

-- Books table
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  description text,
  page_count integer,
  cover_url text,
  pdf_path text NOT NULL,
  file_size_bytes bigint,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published boolean NOT NULL DEFAULT true,
  download_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.books TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published books"
  ON public.books FOR SELECT
  USING (is_published = true OR public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can insert books"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update books"
  ON public.books FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete books"
  ON public.books FOR DELETE
  TO authenticated
  USING (public.is_admin_or_super(auth.uid()));

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for books bucket
CREATE POLICY "Authenticated users can download books"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'books');

CREATE POLICY "Admins can upload books"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'books' AND public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can update books storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'books' AND public.is_admin_or_super(auth.uid()));

CREATE POLICY "Admins can delete books storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'books' AND public.is_admin_or_super(auth.uid()));
