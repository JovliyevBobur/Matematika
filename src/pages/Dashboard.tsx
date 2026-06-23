import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PageTransition } from '@/components/PageTransition';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SUBJECTS, getSubjectById } from '@/lib/constants';
import { 
  BookOpen, Trophy, Clock, TrendingUp, ArrowRight, 
  LayoutDashboard, Crown, Star, Sparkles, Target
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TestAttempt {
  id: string;
  test_id: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total_questions: number | null;
  time_spent_seconds: number | null;
  tests: {
    title: string;
    subject: string;
  };
}

interface Stats {
  totalTests: number;
  avgScore: number;
  totalTime: number;
  recentAttempts: TestAttempt[];
}

export default function Dashboard() {
  const { user, profile, isAdmin, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    const { data: attempts, error } = await supabase
      .from('test_attempts')
      .select(`
        id,
        test_id,
        started_at,
        completed_at,
        score,
        total_questions,
        time_spent_seconds,
        tests (
          title,
          subject
        )
      `)
      .eq('user_id', user!.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(5);

    if (!error && attempts) {
      const completedAttempts = attempts as unknown as TestAttempt[];
      const totalTests = completedAttempts.length;
      const avgScore = totalTests > 0
        ? completedAttempts.reduce((acc, a) => acc + ((a.score || 0) / (a.total_questions || 1) * 100), 0) / totalTests
        : 0;
      const totalTime = completedAttempts.reduce((acc, a) => acc + (a.time_spent_seconds || 0), 0);

      setStats({
        totalTests,
        avgScore: Math.round(avgScore),
        totalTime,
        recentAttempts: completedAttempts,
      });
    }
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}s ${minutes}d`;
    }
    return `${minutes} daqiqa`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <Layout>
      <PageTransition>
        <div className="container py-8">
          {/* Welcome Hero */}
          <div className="relative mb-8 p-8 rounded-3xl overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-secondary">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  {isSuperAdmin && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium">
                      <Crown className="h-4 w-4" />
                      Super Admin
                    </div>
                  )}
                  {isAdmin && !isSuperAdmin && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
                      <Star className="h-4 w-4" />
                      Admin
                    </div>
                  )}
                </div>
                <h1 className="font-display text-4xl font-bold mb-2">
                  Xush kelibsiz, {profile?.full_name?.split(' ')[0]}! 
                  <span className="ml-2">👋</span>
                </h1>
                <p className="text-muted-foreground text-lg max-w-xl">
                  Bugungi testlaringizni ko'rib chiqing va yangi bilimlar oling. 
                  Har bir test sizni maqsadga yaqinlashtiradi!
                </p>
              </div>
              
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent to-primary rounded-full blur-2xl opacity-20" />
                  <div className="relative p-8 bg-card rounded-3xl shadow-xl border">
                    <Target className="h-16 w-16 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Quick Access */}
          {isAdmin && (
            <Card className="mb-8 card-premium border-accent/30 bg-gradient-to-r from-accent/5 to-primary/5">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-4 rounded-2xl shadow-lg",
                    isSuperAdmin 
                      ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white" 
                      : "bg-primary/10"
                  )}>
                    {isSuperAdmin ? (
                      <Crown className="h-8 w-8" />
                    ) : (
                      <LayoutDashboard className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold">
                      {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
                    </h3>
                    <p className="text-muted-foreground">
                      Testlarni boshqarish, savollar qo'shish va statistikani ko'rish
                    </p>
                  </div>
                </div>
                <Link to="/admin">
                  <Button variant="premium" size="lg">
                    Panelga o'tish
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { 
                label: 'Ishlangan testlar', 
                value: stats?.totalTests || 0, 
                icon: BookOpen, 
                gradient: 'from-blue-500 to-indigo-600',
                bgColor: 'bg-blue-500/10'
              },
              { 
                label: "O'rtacha ball", 
                value: `${stats?.avgScore || 0}%`, 
                icon: Trophy, 
                gradient: 'from-amber-500 to-orange-600',
                bgColor: 'bg-amber-500/10'
              },
              { 
                label: 'Umumiy vaqt', 
                value: formatTime(stats?.totalTime || 0), 
                icon: Clock, 
                gradient: 'from-emerald-500 to-teal-600',
                bgColor: 'bg-emerald-500/10'
              },
              { 
                label: 'Reyting', 
                value: 'Ko\'rish →', 
                icon: TrendingUp, 
                gradient: 'from-purple-500 to-pink-600',
                bgColor: 'bg-purple-500/10',
                isLink: true
              },
            ].map((stat, idx) => (
              <Card key={idx} className="card-premium group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                      {loading && !stat.isLink ? (
                        <Skeleton className="h-10 w-20" />
                      ) : stat.isLink ? (
                        <Link to="/leaderboard" className="text-primary font-display text-2xl font-bold hover:underline">
                          {stat.value}
                        </Link>
                      ) : (
                        <p className="font-display text-3xl font-bold">{stat.value}</p>
                      )}
                    </div>
                    <div className={cn(
                      "p-3 rounded-xl transition-transform group-hover:scale-110",
                      stat.bgColor
                    )}>
                      <stat.icon className="h-6 w-6 text-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Recent Tests */}
            <div className="lg:col-span-2">
              <Card className="card-premium h-full">
                <CardHeader className="flex flex-row items-center justify-between border-b">
                  <div>
                    <CardTitle className="font-display text-xl">Oxirgi natijalar</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">So'nggi 5 ta test natijasi</p>
                  </div>
                  <Link to="/profile">
                    <Button variant="ghost" size="sm" className="text-primary">
                      Barchasini ko'rish
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-6">
                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border">
                          <Skeleton className="h-14 w-14 rounded-xl" />
                          <div className="flex-1">
                            <Skeleton className="h-5 w-40 mb-2" />
                            <Skeleton className="h-4 w-28" />
                          </div>
                          <Skeleton className="h-10 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : stats?.recentAttempts.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                        <Sparkles className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="font-display text-xl font-semibold mb-2">Hali test ishlamagansiz</h3>
                      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                        Birinchi testingizni boshlang va natijalaringizni bu yerda ko'ring
                      </p>
                      <Link to="/subjects">
                        <Button variant="premium" size="lg">
                          Testni boshlash
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stats?.recentAttempts.map((attempt) => {
                        const subject = getSubjectById(attempt.tests.subject);
                        const percentage = attempt.total_questions 
                          ? Math.round((attempt.score || 0) / attempt.total_questions * 100)
                          : 0;
                        
                        return (
                          <Link key={attempt.id} to={`/results/${attempt.id}`}>
                            <div className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer group">
                              <div className="text-4xl group-hover:scale-110 transition-transform">{subject?.icon}</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-display font-semibold truncate group-hover:text-primary transition-colors">
                                  {attempt.tests.title}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {subject?.name} • {new Date(attempt.completed_at!).toLocaleDateString('uz-UZ')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={cn("text-2xl font-display font-bold", getScoreColor(percentage))}>
                                  {percentage}%
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {attempt.score}/{attempt.total_questions}
                                </p>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div>
              <Card className="card-premium">
                <CardHeader className="border-b">
                  <CardTitle className="font-display text-xl">Tez test boshlash</CardTitle>
                  <p className="text-sm text-muted-foreground">Fanni tanlang va boshlang</p>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  {SUBJECTS.map((subject) => (
                    <Link key={subject.id} to={`/subjects/${subject.id}`}>
                      <div className="flex items-center gap-4 p-4 rounded-xl border hover:bg-accent/5 hover:border-accent/30 transition-all cursor-pointer group">
                        <span className="text-3xl group-hover:scale-110 transition-transform">{subject.icon}</span>
                        <span className="font-medium flex-1 group-hover:text-primary transition-colors">{subject.name}</span>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
}
