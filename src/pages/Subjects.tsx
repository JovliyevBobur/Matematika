import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PageTransition } from '@/components/PageTransition';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SubjectCard } from '@/components/SubjectCard';
import { SUBJECTS, getSubjectById } from '@/lib/constants';
import { Search, BookOpen, Users, TrendingUp, Clock, FileQuestion, ArrowLeft, Loader2, Play, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Test {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  subject: string;
  is_published: boolean;
  access_code: string | null;
  question_count?: number;
}

interface SubjectStats {
  testCount: number;
  questionCount: number;
  attemptCount: number;
}

export default function Subjects() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalStats, setGlobalStats] = useState({ tests: 0, users: 0, attempts: 0 });
  const [subjectStats, setSubjectStats] = useState<Record<string, SubjectStats>>({});
  
  // Access code dialog state
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [selectedCodedTest, setSelectedCodedTest] = useState<Test | null>(null);
  const [enteredCode, setEnteredCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);

  useEffect(() => {
    fetchGlobalStats();
    fetchSubjectStats();
  }, []);

  useEffect(() => {
    if (subjectId) {
      fetchTests(subjectId as any);
    }
  }, [subjectId]);

  const fetchGlobalStats = async () => {
    const [testsRes, usersRes, attemptsRes] = await Promise.all([
      supabase.from('tests').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('test_attempts').select('*', { count: 'exact', head: true }).not('completed_at', 'is', null),
    ]);

    setGlobalStats({
      tests: testsRes.count || 0,
      users: usersRes.count || 0,
      attempts: attemptsRes.count || 0,
    });
  };

  const fetchSubjectStats = async () => {
    const { data: testsData } = await supabase
      .from('tests')
      .select('id, subject')
      .eq('is_published', true);

    if (!testsData) return;

    const testIds = testsData.map(t => t.id);
    
    const [questionsRes, attemptsRes] = await Promise.all([
      supabase.from('questions').select('test_id').in('test_id', testIds),
      supabase.from('test_attempts').select('test_id').in('test_id', testIds).not('completed_at', 'is', null),
    ]);

    const stats: Record<string, SubjectStats> = {};
    
    SUBJECTS.forEach(s => {
      const subjectTests = testsData.filter(t => t.subject === s.id);
      const subjectTestIds = subjectTests.map(t => t.id);
      
      stats[s.id] = {
        testCount: subjectTests.length,
        questionCount: questionsRes.data?.filter(q => subjectTestIds.includes(q.test_id)).length || 0,
        attemptCount: attemptsRes.data?.filter(a => subjectTestIds.includes(a.test_id)).length || 0,
      };
    });

    setSubjectStats(stats);
  };

  const fetchTests = async (subjectParam: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('tests')
      .select('id, title, description, duration_minutes, subject, is_published, access_code')
      .eq('subject', subjectParam as any)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (data) {
      const testsWithCounts = await Promise.all(
        data.map(async (test) => {
          const { count } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('test_id', test.id);
          return { ...test, question_count: count || 0 };
        })
      );
      setTests(testsWithCounts);
    }
    setLoading(false);
  };

  const handleStartTest = (test: Test) => {
    if (!user) {
      toast.error('Test ishlash uchun tizimga kiring');
      navigate('/login', { state: { from: { pathname: `/test/${test.id}` } } });
      return;
    }
    navigate(`/test/${test.id}`);
  };

  const handleCodedTestAccess = async () => {
    if (!selectedCodedTest || !enteredCode.trim()) {
      toast.error('Kodni kiriting');
      return;
    }

    setVerifyingCode(true);
    
    // Verify code
    const { data } = await supabase
      .from('tests')
      .select('id')
      .eq('id', selectedCodedTest.id)
      .eq('access_code', enteredCode.trim())
      .single();

    if (!data) {
      toast.error('Kod noto\'g\'ri');
      setVerifyingCode(false);
      return;
    }

    setVerifyingCode(false);
    setCodeDialogOpen(false);
    setEnteredCode('');
    
    if (!user) {
      toast.error('Test ishlash uchun tizimga kiring');
      navigate('/login', { state: { from: { pathname: `/test/${selectedCodedTest.id}` } } });
      return;
    }
    
    navigate(`/test/${selectedCodedTest.id}`);
  };

  const filteredSubjects = SUBJECTS.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedSubject = subjectId ? getSubjectById(subjectId) : null;

  // Subject detail view
  if (subjectId && selectedSubject) {
    return (
      <Layout>
        <PageTransition>
          <div className="container py-8">
            {/* Back button & Header */}
            <div className="flex items-center gap-4 mb-8 animate-fade-up">
              <Button variant="outline" size="icon" onClick={() => navigate('/subjects')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
                <div className="flex items-center gap-4">
                  {selectedSubject.iconType === 'image' ? (
                    <img src={selectedSubject.icon} alt={selectedSubject.name} className="w-14 h-14 object-contain" />
                  ) : (
                    <div className="text-5xl">{selectedSubject.icon}</div>
                  )}
                <div>
                  <h1 className="font-serif text-3xl font-bold">{selectedSubject.name}</h1>
                  <p className="text-muted-foreground">
                    {tests.length} ta test mavjud
                  </p>
                </div>
              </div>
            </div>

            {/* Tests Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : tests.length === 0 ? (
              <Card className="card-premium text-center py-16 animate-fade-up">
                <CardContent>
                  <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-serif text-xl font-semibold mb-2">Hali testlar yo'q</h3>
                  <p className="text-muted-foreground">Bu fan bo'yicha tez orada testlar qo'shiladi</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test, idx) => (
                  <Card 
                    key={test.id} 
                    className="card-premium group hover:-translate-y-2 transition-all duration-300 animate-fade-up"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <CardHeader>
                      <CardTitle className="font-serif text-lg group-hover:text-primary transition-colors">
                        {test.title}
                      </CardTitle>
                      {test.description && (
                        <CardDescription className="line-clamp-2">
                          {test.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <FileQuestion className="h-4 w-4" />
                          {test.question_count} savol
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {test.duration_minutes} daqiqa
                        </span>
                      </div>
                      <Button 
                        variant="premium" 
                        className="w-full group/btn"
                        onClick={() => {
                          if (test.access_code) {
                            setSelectedCodedTest(test);
                            setCodeDialogOpen(true);
                          } else {
                            handleStartTest(test);
                          }
                        }}
                      >
                        {test.access_code ? (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Kodni kiritish
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                            Testni boshlash
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </PageTransition>
      </Layout>
    );
  }

  // Subjects list view
  return (
    <Layout>
      
      <PageTransition>
        <div className="container py-8">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-up">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4">
              Fanlar <span className="text-gradient-gold">markazi</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              O'zingizga kerakli fanni tanlang va testlarni boshlang
            </p>
          </div>

          {/* Global Stats */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8 animate-fade-up delay-100">
            {[
              { icon: BookOpen, label: 'Jami testlar', value: globalStats.tests },
              { icon: Users, label: 'Foydalanuvchilar', value: globalStats.users },
              { icon: TrendingUp, label: 'Urinishlar', value: globalStats.attempts },
            ].map((stat, idx) => (
              <Card key={idx} className="card-premium">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <stat.icon className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-serif font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-md mx-auto mb-8 animate-fade-up delay-200">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Fan nomini qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg"
            />
          </div>

          {/* Access Code Section */}
          <Card className="card-premium mb-8 animate-fade-up delay-300">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-lg">Maxfiy test kodi bormi?</h3>
                  <p className="text-sm text-muted-foreground">Kodli testga kirish uchun kodni kiriting</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedCodedTest({ id: '', title: '', description: null, duration_minutes: 30, subject: '', is_published: true, access_code: '' });
                  setCodeDialogOpen(true);
                }}
              >
                Kodni kiritish
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Subjects Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((subject, idx) => (
              <div 
                key={subject.id} 
                className="animate-fade-up" 
                style={{ animationDelay: `${(idx + 4) * 0.1}s` }}
              >
                <SubjectCard
                  id={subject.id}
                  name={subject.name}
                  icon={subject.icon}
                  iconType={subject.iconType}
                  testCount={subjectStats[subject.id]?.testCount || 0}
                />
              </div>
            ))}
          </div>

          {filteredSubjects.length === 0 && (
            <div className="text-center py-16 animate-fade-up">
              <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-serif text-xl font-semibold mb-2">Hech narsa topilmadi</h3>
              <p className="text-muted-foreground">Boshqa qidiruv so'zini kiriting</p>
            </div>
          )}
        </div>

        {/* Access Code Dialog */}
        <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Maxfiy test kodi
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Kirish kodi</Label>
                <Input
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                  placeholder="Masalan: MATH2024"
                  className="h-12 text-lg font-mono text-center tracking-widest"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Kodni o'qituvchingiz yoki admindan oling
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCodeDialogOpen(false)}>Bekor</Button>
              <Button 
                variant="premium" 
                onClick={async () => {
                  if (!enteredCode.trim()) {
                    toast.error('Kodni kiriting');
                    return;
                  }
                  
                  setVerifyingCode(true);
                  
                  // Find test with this code
                  const { data } = await supabase
                    .from('tests')
                    .select('id, title')
                    .eq('access_code', enteredCode.trim())
                    .eq('is_published', true)
                    .single();

                  if (!data) {
                    toast.error('Bunday kodli test topilmadi');
                    setVerifyingCode(false);
                    return;
                  }

                  setVerifyingCode(false);
                  setCodeDialogOpen(false);
                  setEnteredCode('');
                  
                  if (!user) {
                    toast.error('Test ishlash uchun tizimga kiring');
                    navigate('/login', { state: { from: { pathname: `/test/${data.id}` } } });
                    return;
                  }
                  
                  navigate(`/test/${data.id}`);
                }}
                disabled={verifyingCode}
              >
                {verifyingCode ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Testga kirish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </Layout>
  );
}
