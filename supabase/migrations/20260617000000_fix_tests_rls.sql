-- Eskirgan Test siyosatlarini o'chirish
DROP POLICY IF EXISTS "Anyone can view published tests" ON public.tests;
DROP POLICY IF EXISTS "Admins can insert tests" ON public.tests;
DROP POLICY IF EXISTS "Admins can update tests" ON public.tests;
DROP POLICY IF EXISTS "Admins can delete tests" ON public.tests;

-- user_roles jadvaliga asoslangan yangi Test siyosatlarini yaratish
CREATE POLICY "Anyone can view published tests" ON public.tests
  FOR SELECT USING (is_published = true OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Admins can insert tests" ON public.tests
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Admins can update tests" ON public.tests
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

CREATE POLICY "Admins can delete tests" ON public.tests
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- Eskirgan Savollar (questions) siyosatlarini o'chirish
DROP POLICY IF EXISTS "Anyone can view questions of published tests" ON public.questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;

-- Yangi Savollar siyosatlarini yaratish
CREATE POLICY "Anyone can view questions of published tests" ON public.questions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.tests WHERE tests.id = questions.test_id AND (tests.is_published = true OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    ))
  ));

CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- Eskirgan Javoblar (choices) siyosatlarini o'chirish
DROP POLICY IF EXISTS "Anyone can view choices of published tests" ON public.choices;
DROP POLICY IF EXISTS "Admins can manage choices" ON public.choices;

-- Yangi Javoblar siyosatlarini yaratish
CREATE POLICY "Anyone can view choices of published tests" ON public.choices
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.tests t ON t.id = q.test_id
    WHERE q.id = choices.question_id AND (t.is_published = true OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    ))
  ));

CREATE POLICY "Admins can manage choices" ON public.choices
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));
