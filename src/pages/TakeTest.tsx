import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { getSubjectById } from '@/lib/constants';
import { Loader2, Clock, ChevronLeft, ChevronRight, Flag, AlertTriangle, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { cacheData, getCachedData } from '@/lib/cache';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface Choice {
  id: string;
  choice_text: string;
  order_index: number;
}

interface Question {
  id: string;
  question_text: string;
  order_index: number;
  choices: Choice[];
}

interface Test {
  id: string;
  title: string;
  subject: string;
  duration_minutes: number;
}

export default function TakeTest() {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const startTimeRef = useRef<Date>(new Date());

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (testId && user) {
      fetchTestAndStart();
    }
  }, [testId, user]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const fetchTestAndStart = async () => {
    let testData: any;
    let questionsData: any;

    if (!navigator.onLine) {
      toast.info('Oflayn rejim: Keshlangan savollar qidirilmoqda');
      testData = await getCachedData(`test_${testId}`);
      questionsData = await getCachedData(`questions_raw_${testId}`);
      if (!testData || !questionsData) {
        toast.error('Oflayn rejim: Ushbu test keshlanmagan');
        navigate('/subjects');
        return;
      }
    } else {
      // Fetch test details
      const { data: tData, error: testError } = await supabase
        .from('tests')
        .select('id, title, subject, duration_minutes')
        .eq('id', testId)
        .single();

      if (testError || !tData) {
        toast.error('Test topilmadi');
        navigate('/subjects');
        return;
      }
      testData = tData;

      // Fetch questions with choices
      const { data: qData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          question_text,
          order_index,
          choices (
            id,
            choice_text,
            order_index
          )
        `)
        .eq('test_id', testId)
        .order('order_index');

      if (questionsError || !qData || qData.length === 0) {
        toast.error('Savollar topilmadi');
        navigate('/subjects');
        return;
      }
      questionsData = qData;

      // Cache data for offline use
      await cacheData(`test_${testId}`, testData);
      await cacheData(`questions_raw_${testId}`, questionsData);
    }

    setTest(testData);
    setTimeLeft(testData.duration_minutes * 60);

    // Sort choices by order_index
    const sortedQuestions = questionsData.map((q: any) => ({
      ...q,
      choices: q.choices.sort((a: any, b: any) => a.order_index - b.order_index),
    }));

    setQuestions(sortedQuestions);

    if (!navigator.onLine) {
      // Fake attempt ID for offline mode
      setAttemptId(`offline_${Date.now()}`);
      toast.warning("Siz oflayn rejimdasiz. Natijangiz serverda saqlanmaydi.");
    } else {
      // Create test attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('test_attempts')
        .insert({
          user_id: user!.id,
          test_id: testId,
          total_questions: questionsData.length,
        })
        .select()
        .single();

      if (attemptError) {
        toast.error('Test boshlanmadi. Qayta urinib ko\'ring.');
        navigate('/subjects');
        return;
      }
      setAttemptId(attemptData.id);
    }

    startTimeRef.current = new Date();
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionId: string, choiceId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
  };

  const handleSubmit = async () => {
    if (!attemptId || submitting) return;
    
    setSubmitting(true);
    setShowSubmitDialog(false);

    const timeSpent = Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000);

    if (!navigator.onLine || attemptId.startsWith('offline_')) {
      toast.success("Oflayn test yakunlandi!");
      // Optionally store results in cache here
      navigate('/tests'); // Since we can't show results easily without server, navigate back
      return;
    }

    // Get correct answers for scoring
    const { data: correctAnswers } = await supabase
      .from('choices')
      .select('id, question_id, is_correct')
      .in('question_id', questions.map((q) => q.id))
      .eq('is_correct', true);

    const correctMap = new Map(
      correctAnswers?.map((c) => [c.question_id, c.id]) || []
    );

    // Calculate score and prepare answers
    let score = 0;
    const userAnswersData = questions.map((q) => {
      const selectedChoiceId = answers[q.id] || null;
      const correctChoiceId = correctMap.get(q.id);
      const isCorrect = selectedChoiceId === correctChoiceId;
      if (isCorrect) score++;

      return {
        attempt_id: attemptId,
        question_id: q.id,
        selected_choice_id: selectedChoiceId,
        is_correct: selectedChoiceId ? isCorrect : null,
      };
    });

    // Save answers
    await supabase.from('user_answers').insert(userAnswersData);

    // Update attempt with results
    await supabase
      .from('test_attempts')
      .update({
        completed_at: new Date().toISOString(),
        score,
        time_spent_seconds: timeSpent,
      })
      .eq('id', attemptId);

    // Navigate to results
    navigate(`/results/${attemptId}`);
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Test yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const subject = getSubjectById(test?.subject || '');
  const isTimeWarning = timeLeft < 60;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{subject?.icon}</span>
            <div>
              <h1 className="font-display font-semibold">{test?.title}</h1>
              <p className="text-xs text-muted-foreground">
                {answeredCount}/{questions.length} javob berildi
              </p>
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold",
            isTimeWarning ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-muted"
          )}>
            <Clock className="h-5 w-5" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </header>

      <main className="container py-8 max-w-3xl">
        {/* Question Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "w-10 h-10 rounded-lg font-medium transition-all",
                idx === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : answers[q.id]
                  ? "bg-success text-success-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        {/* Question Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Savol {currentIndex + 1}/{questions.length}
              </span>
              {answers[currentQuestion.id] && (
                <span className="text-sm text-success font-medium">Javob berildi ✓</span>
              )}
            </div>
            <CardTitle className="font-display text-xl leading-relaxed">
              {currentQuestion.question_text}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[currentQuestion.id] || ''}
              onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
              className="space-y-3"
            >
              {currentQuestion.choices.map((choice, idx) => (
                <div
                  key={choice.id}
                  className={cn(
                    "flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    answers[currentQuestion.id] === choice.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  )}
                  onClick={() => handleAnswer(currentQuestion.id, choice.id)}
                >
                  <RadioGroupItem value={choice.id} id={choice.id} />
                  <Label htmlFor={choice.id} className="flex-1 cursor-pointer text-base">
                    <span className="font-semibold mr-2">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {choice.choice_text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Oldingi
          </Button>

          {currentIndex === questions.length - 1 ? (
            <Button variant="gradient" onClick={() => setShowSubmitDialog(true)}>
              <Flag className="h-4 w-4 mr-1" />
              Testni yakunlash
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
            >
              Keyingi
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </main>

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Testni yakunlaysizmi?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Siz {answeredCount}/{questions.length} ta savolga javob berdingiz.
                </p>
                {answeredCount < questions.length && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 text-warning">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">
                      {questions.length - answeredCount} ta savol javobsiz qoldi
                    </span>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Davom etish</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Yakunlash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
