import { useEffect, useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSubjectById, SUBJECTS } from '@/lib/constants';
import { User, Trophy, Clock, BookOpen, TrendingUp, Edit, Save, X, Camera, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TestAttempt {
  id: string;
  test_id: string;
  started_at: string;
  completed_at: string;
  score: number;
  total_questions: number;
  time_spent_seconds: number;
  tests: {
    title: string;
    subject: string;
  };
}

interface SubjectStats {
  subject: string;
  tests_completed: number;
  avg_score: number;
  total_time: number;
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const fetchData = async () => {
    const { data: attemptsData } = await supabase
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
      .order('completed_at', { ascending: false });

    if (attemptsData) {
      setAttempts(attemptsData as unknown as TestAttempt[]);

      const statsMap = new Map<string, SubjectStats>();
      
      attemptsData.forEach((attempt: any) => {
        const subject = attempt.tests?.subject;
        if (!subject) return;
        const existing = statsMap.get(subject) || {
          subject,
          tests_completed: 0,
          avg_score: 0,
          total_time: 0,
        };

        const percentage = (attempt.score / attempt.total_questions) * 100;
        existing.tests_completed++;
        existing.avg_score = (existing.avg_score * (existing.tests_completed - 1) + percentage) / existing.tests_completed;
        existing.total_time += attempt.time_spent_seconds || 0;

        statsMap.set(subject, existing);
      });

      setSubjectStats(Array.from(statsMap.values()));
    }

    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Faqat rasm fayllari yuklanishi mumkin');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Rasm hajmi 2MB dan oshmasligi kerak');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success('Profil rasmi yangilandi');
    } catch (error: any) {
      toast.error('Rasm yuklashda xatolik: ' + (error.message || 'Noma\'lum xato'));
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('Ism bo\'sh bo\'lishi mumkin emas');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('user_id', user!.id);

    if (error) {
      toast.error('Xatolik yuz berdi');
    } else {
      toast.success('Ma\'lumotlar saqlandi');
      await refreshProfile();
      setEditing(false);
    }
    setSaving(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getGrade = (p: number) => {
    if (p >= 95) return { grade: 'A+', label: "Mukammal", color: 'text-emerald-500' };
    if (p >= 85) return { grade: 'A',  label: "A'lo",      color: 'text-emerald-500' };
    if (p >= 75) return { grade: 'B+', label: 'Juda yaxshi', color: 'text-success' };
    if (p >= 65) return { grade: 'B',  label: 'Yaxshi',     color: 'text-success' };
    if (p >= 50) return { grade: 'C+', label: 'Qoniqarli',  color: 'text-warning' };
    return            { grade: 'C',  label: "Boshlang'ich", color: 'text-destructive' };
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}s ${minutes}d`;
    }
    return `${minutes} daqiqa`;
  };

  const totalTests = attempts.length;
  const avgScore = totalTests > 0
    ? Math.round(attempts.reduce((acc, a) => acc + (a.score / a.total_questions * 100), 0) / totalTests)
    : 0;
  const totalTime = attempts.reduce((acc, a) => acc + (a.time_spent_seconds || 0), 0);

  return (
    <Layout>
      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <Avatar className="h-24 w-24 border-4 border-primary/30 shadow-xl">
                    <AvatarImage src={profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                      {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="fullName">To'liq ism</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        <Save className="h-4 w-4 mr-1" />
                        Saqlash
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                        <X className="h-4 w-4 mr-1" />
                        Bekor
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="font-display text-xl font-bold mb-1">{profile?.full_name}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{user?.email}</p>
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Tahrirlash
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Umumiy statistika</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalTests}</p>
                    <p className="text-xs text-muted-foreground">Ishlangan testlar</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Trophy className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{avgScore}%</p>
                    <p className="text-xs text-muted-foreground">O'rtacha ball</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Clock className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatTime(totalTime)}</p>
                    <p className="text-xs text-muted-foreground">Umumiy vaqt</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="history">
              <TabsList className="mb-6">
                <TabsTrigger value="history">Test tarixi</TabsTrigger>
                <TabsTrigger value="subjects">Fanlar bo'yicha</TabsTrigger>
              </TabsList>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Oxirgi natijalar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                            <Skeleton className="h-12 w-12 rounded-lg" />
                            <div className="flex-1">
                              <Skeleton className="h-5 w-32 mb-2" />
                              <Skeleton className="h-4 w-24" />
                            </div>
                            <Skeleton className="h-8 w-16" />
                          </div>
                        ))}
                      </div>
                    ) : attempts.length === 0 ? (
                      <div className="text-center py-12">
                        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">Hali test ishlamagansiz</h3>
                        <p className="text-sm text-muted-foreground">
                          Birinchi testingizni boshlang!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {attempts.map((attempt) => {
                          const subject = getSubjectById(attempt.tests?.subject);
                          const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
                          const gradeInfo = getGrade(percentage);

                          return (
                            <div
                              key={attempt.id}
                              className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="text-3xl">{subject?.icon}</div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{attempt.tests?.title}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {subject?.name} • {new Date(attempt.completed_at).toLocaleDateString('uz-UZ')}
                                </p>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-xl font-bold", gradeInfo.color)}>{percentage}%</span>
                                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded border bg-background/50", gradeInfo.color)}>
                                    {gradeInfo.grade}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {attempt.score}/{attempt.total_questions} to'g'ri
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subjects">
                <div className="grid sm:grid-cols-2 gap-4">
                  {SUBJECTS.map((sub) => {
                    const stats = subjectStats.find((s) => s.subject === sub.id);

                    return (
                      <Card key={sub.id}>
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="text-4xl">{sub.icon}</div>
                            <div>
                              <h3 className="font-display font-semibold">{sub.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {stats?.tests_completed || 0} ta test ishlangan
                              </p>
                            </div>
                          </div>
                          {stats ? (
                            <div className="grid grid-cols-2 gap-4 text-center">
                              <div className="p-3 rounded-lg bg-muted">
                                <p className="text-xl font-bold">{Math.round(stats.avg_score)}%</p>
                                <p className="text-xs text-muted-foreground">O'rtacha</p>
                              </div>
                              <div className="p-3 rounded-lg bg-muted">
                                <p className="text-xl font-bold">{formatTime(stats.total_time)}</p>
                                <p className="text-xs text-muted-foreground">Vaqt</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-center text-sm text-muted-foreground py-4">
                              Hali test ishlanmagan
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}
