-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- Create enum for subjects
CREATE TYPE public.subject AS ENUM ('math', 'physics', 'english', 'history', 'russian', 'uzbek');

-- Create profiles table for user metadata
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tests table
CREATE TABLE public.tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject subject NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create choices table
CREATE TABLE public.choices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Create test_attempts table to track user attempts
CREATE TABLE public.test_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  total_questions INTEGER,
  time_spent_seconds INTEGER
);

-- Create user_answers table to store individual answers
CREATE TABLE public.user_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_choice_id UUID REFERENCES public.choices(id) ON DELETE SET NULL,
  is_correct BOOLEAN
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tests policies (everyone can view published tests, admins can manage all)
CREATE POLICY "Anyone can view published tests" ON public.tests
  FOR SELECT USING (is_published = true OR EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can insert tests" ON public.tests
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can update tests" ON public.tests
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can delete tests" ON public.tests
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Questions policies
CREATE POLICY "Anyone can view questions of published tests" ON public.questions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.tests WHERE tests.id = questions.test_id AND (tests.is_published = true OR EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    ))
  ));

CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Choices policies
CREATE POLICY "Anyone can view choices of published tests" ON public.choices
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.tests t ON t.id = q.test_id
    WHERE q.id = choices.question_id AND (t.is_published = true OR EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    ))
  ));

CREATE POLICY "Admins can manage choices" ON public.choices
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Test attempts policies
CREATE POLICY "Users can view their own attempts" ON public.test_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attempts" ON public.test_attempts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Authenticated users can create attempts" ON public.test_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attempts" ON public.test_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- User answers policies
CREATE POLICY "Users can view their own answers" ON public.user_answers
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.test_attempts WHERE test_attempts.id = user_answers.attempt_id AND test_attempts.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own answers" ON public.user_answers
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.test_attempts WHERE test_attempts.id = user_answers.attempt_id AND test_attempts.user_id = auth.uid()
  ));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tests_updated_at
  BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_subject subject DEFAULT NULL, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  total_score BIGINT,
  tests_completed BIGINT,
  avg_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(SUM(ta.score), 0)::BIGINT as total_score,
    COUNT(ta.id)::BIGINT as tests_completed,
    ROUND(COALESCE(AVG(ta.score::NUMERIC / NULLIF(ta.total_questions, 0) * 100), 0), 1) as avg_score
  FROM public.profiles p
  LEFT JOIN public.test_attempts ta ON ta.user_id = p.user_id AND ta.completed_at IS NOT NULL
  LEFT JOIN public.tests t ON t.id = ta.test_id
  WHERE p_subject IS NULL OR t.subject = p_subject
  GROUP BY p.user_id, p.full_name, p.avatar_url
  ORDER BY total_score DESC, avg_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;