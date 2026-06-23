import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PageTransition } from '@/components/PageTransition';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getSubjectById } from '@/lib/constants';
import { Loader2, Trophy, Clock, CheckCircle, XCircle, RotateCcw, Home, Info, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Choice {
  id: string;
  choice_text: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  question_text: string;
  choices: Choice[];
}

interface UserAnswer {
  question_id: string;
  selected_choice_id: string | null;
  is_correct: boolean | null;
}

interface AttemptResult {
  id: string;
  score: number;
  total_questions: number;
  time_spent_seconds: number;
  test: {
    id: string;
    title: string;
    subject: string;
  };
  questions: Question[];
  answers: UserAnswer[];
}

export default function Results() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { session } = useAuth();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (attemptId) {
      fetchResults();
    }
  }, [attemptId]);

  const fetchResults = async () => {
    const { data: attemptData, error: attemptError } = await supabase
      .from('test_attempts')
      .select(`
        id,
        score,
        total_questions,
        time_spent_seconds,
        tests (
          id,
          title,
          subject
        )
      `)
      .eq('id', attemptId)
      .single();

    if (attemptError || !attemptData) {
      setLoading(false);
      return;
    }

    const { data: questionsData } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        choices (
          id,
          choice_text,
          is_correct
        )
      `)
      .eq('test_id', (attemptData.tests as any).id)
      .order('order_index');

    const { data: answersData } = await supabase
      .from('user_answers')
      .select('question_id, selected_choice_id, is_correct')
      .eq('attempt_id', attemptId);

    setResult({
      id: attemptData.id,
      score: attemptData.score || 0,
      total_questions: attemptData.total_questions || 0,
      time_spent_seconds: attemptData.time_spent_seconds || 0,
      test: attemptData.tests as any,
      questions: questionsData || [],
      answers: answersData || [],
    });

    setLoading(false);

    const percentage = ((attemptData.score || 0) / (attemptData.total_questions || 1)) * 100;
    if (percentage >= 80) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }, 500);
    }
  };

  const getGrade = (p: number) => {
    if (p >= 95) return { grade: 'A+', label: "Mukammal", color: 'text-emerald-500', msg: 'Mukammal natija! 🏆' };
    if (p >= 85) return { grade: 'A',  label: "A'lo",      color: 'text-emerald-500', msg: 'Ajoyib! 🎉' };
    if (p >= 75) return { grade: 'B+', label: 'Juda yaxshi', color: 'text-success',  msg: 'Juda yaxshi 👏' };
    if (p >= 65) return { grade: 'B',  label: 'Yaxshi',     color: 'text-success',   msg: 'Yaxshi natija 💪' };
    if (p >= 50) return { grade: 'C+', label: 'Qoniqarli',  color: 'text-warning',   msg: 'Qoniqarli, ko\'proq mashq qiling 📚' };
    return            { grade: 'C',  label: "Boshlang'ich", color: 'text-destructive', msg: 'Qayta urinib ko\'ring 🔄' };
  };

  const toggleQuestionExpand = (questionId: string) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const handleAiAnalysis = async () => {
    if (!result || analyzing) return;
    setAnalyzing(true);
    try {
      const questionsForAi = result.questions.map((q, i) => {
        const userAnswer = result.answers.find(a => a.question_id === q.id);
        const selectedChoice = q.choices.find(c => c.id === userAnswer?.selected_choice_id);
        return {
          index: i + 1,
          question_text: q.question_text,
          choices: q.choices.map(c => ({ text: c.choice_text, is_correct: c.is_correct })),
          user_choice: selectedChoice?.choice_text || null,
          is_correct: userAnswer?.is_correct ?? null,
        };
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ mode: 'analyze', questions: questionsForAi }),
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setAiAnalysis(data.analysis || 'Tahlil olishda xatolik.');
      setShowAnswers(true);
    } catch {
      toast.error('AI tahlil qilishda xatolik yuz berdi');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!result) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <h1 className="font-serif text-2xl font-bold mb-4">Natija topilmadi</h1>
          <Link to="/dashboard">
            <Button>Bosh sahifaga qaytish</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const percentage = Math.round((result.score / result.total_questions) * 100);
  const subject = getSubjectById(result.test.subject);
  const wrongAnswers = result.answers.filter(a => a.is_correct === false);

  return (
    <Layout>
      <PageTransition>
        <div className="container py-8 max-w-4xl">
          {/* Score Card */}
          <Card className="mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-primary via-accent to-primary p-8 text-center text-white">
              <div className="text-6xl mb-4">📐</div>
              <h1 className="font-serif text-3xl font-bold mb-2">{result.test.title}</h1>
              <p className="opacity-80">Matematika</p>
            </div>
            <CardContent className="p-8">
              <div className="text-center mb-8">
                {(() => {
                  const g = getGrade(percentage);
                  return (
                    <>
                      <div className={cn("inline-flex items-baseline gap-3 mb-2")}>
                        <span className={cn("text-7xl font-serif font-bold", g.color)}>{percentage}%</span>
                        <span className={cn("text-4xl font-serif font-bold px-4 py-1 rounded-xl border-2", g.color)}>{g.grade}</span>
                      </div>
                      <p className="text-lg text-muted-foreground">Daraja: <strong>{g.label}</strong></p>
                    </>
                  );
                })()}
                <p className="text-xl text-muted-foreground mb-4">
                  {result.score} / {result.total_questions} to'g'ri javob
                </p>
                <p className="text-2xl font-semibold">{getGrade(percentage).msg}</p>
              </div>

              <Progress value={percentage} className="h-4 mb-8" />

              <div className="grid sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-lg bg-muted">
                  <Trophy className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{result.score}</p>
                  <p className="text-sm text-muted-foreground">To'g'ri</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <XCircle className="h-6 w-6 mx-auto mb-2 text-destructive" />
                  <p className="text-2xl font-bold">{result.total_questions - result.score}</p>
                  <p className="text-sm text-muted-foreground">Noto'g'ri</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-info" />
                  <p className="text-2xl font-bold">{Math.floor(result.time_spent_seconds / 60)}</p>
                  <p className="text-sm text-muted-foreground">Daqiqa</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <Link to={`/test/${result.test.id}`}>
              <Button variant="premium" size="lg">
                <RotateCcw className="h-5 w-5 mr-2" />
                Qayta ishlash
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowAnswers(!showAnswers)}
            >
              {showAnswers ? 'Javoblarni yashirish' : 'Javoblarni ko\'rish'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleAiAnalysis}
              disabled={analyzing}
              className="gap-2 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
            >
              {analyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {analyzing ? 'Tahlil qilinmoqda...' : 'Testni tahlil qilish'}
            </Button>
            <Link to="/dashboard">
              <Button variant="outline" size="lg">
                <Home className="h-5 w-5 mr-2" />
                Bosh sahifa
              </Button>
            </Link>
          </div>

          {/* AI Analysis */}
          {aiAnalysis && (
            <Card className="mb-8 border-emerald-500/30 bg-emerald-500/5 animate-fade-up">
              <CardHeader>
                <CardTitle className="font-serif text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  AI Tahlil — Al-Xorazmiy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {aiAnalysis}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Answers Review */}
          {showAnswers && (
            <div className="space-y-4">
              <h2 className="font-serif text-2xl font-bold mb-4">Javoblar tahlili</h2>
              
              {/* Summary for wrong answers */}
              {wrongAnswers.length > 0 && (
                <Card className="border-warning/30 bg-warning/5 mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Info className="h-5 w-5 text-warning" />
                      <p className="text-sm">
                        <strong>{wrongAnswers.length}</strong> ta savolga noto'g'ri javob berdingiz. 
                        Har bir savolning yechimini ko'rish uchun ustiga bosing.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {result.questions.map((question, idx) => {
                const userAnswer = result.answers.find((a) => a.question_id === question.id);
                const isCorrect = userAnswer?.is_correct;
                const correctChoice = question.choices.find((c) => c.is_correct);
                const selectedChoice = question.choices.find((c) => c.id === userAnswer?.selected_choice_id);
                const isExpanded = expandedQuestions[question.id];

                return (
                  <Card 
                    key={question.id} 
                    className={cn(
                      "border-2 transition-all cursor-pointer",
                      isCorrect ? "border-success/30" : "border-destructive/30"
                    )}
                    onClick={() => !isCorrect && toggleQuestionExpand(question.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0",
                          isCorrect ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                        )}>
                          {isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="font-serif text-lg">
                            {idx + 1}. {question.question_text}
                          </CardTitle>
                        </div>
                        {!isCorrect && (
                          <Button variant="ghost" size="icon" className="flex-shrink-0">
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 ml-11">
                        {question.choices.map((choice) => {
                          const isSelected = userAnswer?.selected_choice_id === choice.id;
                          const isCorrectChoice = choice.is_correct;

                          return (
                            <div
                              key={choice.id}
                              className={cn(
                                "p-3 rounded-lg border",
                                isCorrectChoice && "bg-success/10 border-success",
                                isSelected && !isCorrectChoice && "bg-destructive/10 border-destructive",
                                !isSelected && !isCorrectChoice && "bg-muted/50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {isCorrectChoice && <CheckCircle className="h-4 w-4 text-success" />}
                                {isSelected && !isCorrectChoice && <XCircle className="h-4 w-4 text-destructive" />}
                                <span className={cn(
                                  isCorrectChoice && "font-semibold text-success",
                                  isSelected && !isCorrectChoice && "line-through text-destructive"
                                )}>
                                  {choice.choice_text}
                                </span>
                                {isSelected && <span className="text-xs text-muted-foreground">(sizning javobingiz)</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation for wrong answers */}
                      {!isCorrect && isExpanded && (
                        <div className="mt-4 ml-11 p-4 rounded-lg bg-info/10 border border-info/30">
                          <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-info mb-2">Tushuntirish:</p>
                              <p className="text-sm text-muted-foreground">
                                To'g'ri javob: <strong className="text-success">{correctChoice?.choice_text}</strong>
                              </p>
                              {selectedChoice && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Siz tanladingiz: <span className="text-destructive line-through">{selectedChoice.choice_text}</span>
                                </p>
                              )}
                              {!selectedChoice && (
                                <p className="text-sm text-warning mt-1">
                                  Siz bu savolga javob bermadingiz.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </PageTransition>
    </Layout>
  );
}
