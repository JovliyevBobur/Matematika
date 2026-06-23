import { useEffect, useState, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageTransition } from '@/components/PageTransition';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SUBJECTS, getSubjectById } from '@/lib/constants';
import { ImportProgressBar, type ImportStage } from '@/components/admin/ImportProgressBar';
import { ImportPreviewDialog } from '@/components/admin/ImportPreviewDialog';
import { ManualTestCreator } from '@/components/admin/ManualTestCreator';
import { BooksAdmin } from '@/components/admin/BooksAdmin';
import { SubjectIcon } from '@/components/SubjectIcon';
import { 
  Plus, Trash2, Edit, BookOpen, Users, FileQuestion, Loader2, 
  Crown, Shield, CheckCircle, XCircle, Save, LayoutDashboard, TrendingUp,
  Upload, FileText, Ban, UserCheck, BarChart3, Target, Award, Lock, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Test {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  duration_minutes: number;
  is_published: boolean;
  access_code: string | null;
  question_count?: number;
  attempt_count?: number;
  avg_score?: number;
}

interface Question {
  id: string;
  question_text: string;
  order_index: number;
  choices: Choice[];
}

interface Choice {
  id: string;
  choice_text: string;
  is_correct: boolean;
  order_index: number;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  is_blocked: boolean;
  created_at: string;
  role?: 'super_admin' | 'admin' | 'user';
}

interface TestStats {
  id: string;
  title: string;
  subject: string;
  attempt_count: number;
  avg_score: number;
}

interface PdfImportJob {
  id: string;
  title: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  stage: string;
  progress: number;
  attempt_count: number;
  max_attempts: number;
  error_message: string | null;
  error_stage: string | null;
  debug: unknown;
  result_test_id: string | null;
  questions_count: number | null;
}

export default function Admin() {
  const { user, isAdmin, isSuperAdmin, session } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [topTests, setTopTests] = useState<TestStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ tests: 0, questions: 0, users: 0, attempts: 0, avgScore: 0 });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAccessCode, setShowAccessCode] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('math');
  const [duration, setDuration] = useState(30);
  const [accessCode, setAccessCode] = useState('');

  // PDF import state
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfSubject, setPdfSubject] = useState('math');
  const [pdfDuration, setPdfDuration] = useState(30);
  const [pdfAccessCode, setPdfAccessCode] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfAnswerKeys, setPdfAnswerKeys] = useState('');
  const [pdfAnswerKeyImage, setPdfAnswerKeyImage] = useState<File | null>(null);
  const answerKeyImageRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importStage, setImportStage] = useState<ImportStage>(0);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [importedTestId, setImportedTestId] = useState<string | null>(null);
  const [importedTestTitle, setImportedTestTitle] = useState('');
  const [importedQuestionsCount, setImportedQuestionsCount] = useState(0);
  const [importError, setImportError] = useState<{ message: string; stage?: string; debug?: unknown; attempt?: number } | null>(null);
  const [importAttempt, setImportAttempt] = useState(0);
  const [importJob, setImportJob] = useState<PdfImportJob | null>(null);
  const importPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Question form state
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newChoices, setNewChoices] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  useEffect(() => {
    fetchTests();
    fetchStats();
    fetchTopTests();
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    return () => {
      if (importPollRef.current) clearInterval(importPollRef.current);
    };
  }, []);

  const fetchStats = async () => {
    const [testsRes, questionsRes, usersRes, attemptsRes] = await Promise.all([
      supabase.from('tests').select('*', { count: 'exact', head: true }),
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('test_attempts').select('score, total_questions').not('completed_at', 'is', null),
    ]);

    const attempts = attemptsRes.data || [];
    const avgScore = attempts.length > 0
      ? attempts.reduce((acc, a) => acc + ((a.score || 0) / (a.total_questions || 1) * 100), 0) / attempts.length
      : 0;

    setStats({
      tests: testsRes.count || 0,
      questions: questionsRes.count || 0,
      users: usersRes.count || 0,
      attempts: attempts.length,
      avgScore: Math.round(avgScore),
    });
  };

  const fetchTopTests = async () => {
    const { data: attempts } = await supabase
      .from('test_attempts')
      .select(`
        test_id,
        score,
        total_questions,
        tests (
          id,
          title,
          subject
        )
      `)
      .not('completed_at', 'is', null);

    if (attempts) {
      const testMap = new Map<string, { title: string; subject: string; scores: number[]; count: number }>();
      
      attempts.forEach((attempt: any) => {
        if (attempt.tests) {
          const testId = attempt.test_id;
          if (!testMap.has(testId)) {
            testMap.set(testId, {
              title: attempt.tests.title,
              subject: attempt.tests.subject,
              scores: [],
              count: 0,
            });
          }
          const test = testMap.get(testId)!;
          test.count++;
          if (attempt.score && attempt.total_questions) {
            test.scores.push((attempt.score / attempt.total_questions) * 100);
          }
        }
      });

      const topTestsArray: TestStats[] = Array.from(testMap.entries())
        .map(([id, data]) => ({
          id,
          title: data.title,
          subject: data.subject,
          attempt_count: data.count,
          avg_score: data.scores.length > 0 
            ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
            : 0,
        }))
        .sort((a, b) => b.attempt_count - a.attempt_count)
        .slice(0, 5);

      setTopTests(topTestsArray);
    }
  };

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profiles) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      const usersWithRoles = profiles.map(p => ({
        ...p,
        role: roleMap.get(p.user_id) as 'super_admin' | 'admin' | 'user' || 'user',
      }));
      
      setUsers(usersWithRoles);
    }
  };

  const fetchTests = async () => {
    const { data } = await supabase
      .from('tests')
      .select('id, title, description, subject, duration_minutes, is_published, access_code')
      .order('created_at', { ascending: false });

    if (data) {
      const testsWithCounts = await Promise.all(
        data.map(async (test) => {
          const [questionRes, attemptRes] = await Promise.all([
            supabase.from('questions').select('*', { count: 'exact', head: true }).eq('test_id', test.id),
            supabase.from('test_attempts').select('score, total_questions').eq('test_id', test.id).not('completed_at', 'is', null),
          ]);
          
          const attempts = attemptRes.data || [];
          const avgScore = attempts.length > 0
            ? attempts.reduce((acc, a) => acc + ((a.score || 0) / (a.total_questions || 1) * 100), 0) / attempts.length
            : 0;

          return { 
            ...test, 
            question_count: questionRes.count || 0,
            attempt_count: attempts.length,
            avg_score: Math.round(avgScore),
          };
        })
      );
      setTests(testsWithCounts);
    }
    setLoading(false);
  };

  const fetchQuestions = async (testId: string) => {
    const { data } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        order_index,
        choices (
          id,
          choice_text,
          is_correct,
          order_index
        )
      `)
      .eq('test_id', testId)
      .order('order_index');

    if (data) {
      setQuestions(data.map(q => ({
        ...q,
        choices: q.choices.sort((a, b) => a.order_index - b.order_index)
      })));
    }
  };

  const handleSaveTest = async () => {
    if (!title.trim()) {
      toast.error('Test nomini kiriting');
      return;
    }

    setSaving(true);
    if (editingTest) {
      await supabase.from('tests').update({
        title: title.trim(),
        description: description.trim() || null,
        subject: subject as any,
        duration_minutes: duration,
        access_code: accessCode.trim() || null,
      }).eq('id', editingTest.id);
      toast.success('Test yangilandi');
    } else {
      await supabase.from('tests').insert({
        title: title.trim(),
        description: description.trim() || null,
        subject: subject as any,
        duration_minutes: duration,
        created_by: user!.id,
        access_code: accessCode.trim() || null,
      });
      toast.success('Test yaratildi');
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchTests();
    fetchStats();
  };

  const pollPdfImportJob = (jobId: string, fallbackTitle: string) => {
    if (importPollRef.current) clearInterval(importPollRef.current);

    const poll = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-pdf-to-test?job_id=${jobId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || `Status tekshirish xatoligi: HTTP ${response.status}`);

        const job = data.job as PdfImportJob;
        setImportJob(job);
        setImportAttempt(job.attempt_count || 1);
        if (job.status === 'queued') setImportStage(1);
        if (job.status === 'running') setImportStage(job.stage?.startsWith('db-') ? 3 : 2);

        if (job.status === 'done') {
          if (importPollRef.current) clearInterval(importPollRef.current);
          importPollRef.current = null;
          setImportStage(4);
          setImportedTestId(job.result_test_id);
          setImportedTestTitle(job.title || fallbackTitle);
          setImportedQuestionsCount(job.questions_count || 0);
          setPdfDialogOpen(false);
          setPreviewDialogOpen(true);
          setImporting(false);
          setImportError(null);
          setImportJob(null);
          resetPdfForm();
          fetchTests();
          fetchStats();
          toast.success(`${job.questions_count || 0} ta savol yaratildi`);
        }

        if (job.status === 'failed') {
          if (importPollRef.current) clearInterval(importPollRef.current);
          importPollRef.current = null;
          setImportStage(0);
          setImporting(false);
          setImportError({
            message: job.error_message || 'PDF import muvaffaqiyatsiz tugadi',
            stage: job.error_stage || job.stage,
            debug: job.debug,
            attempt: job.attempt_count,
          });
          toast.error(job.error_message || 'PDF import muvaffaqiyatsiz tugadi');
        }
      } catch (error: any) {
        setImportError({ message: error.message || 'Import statusini tekshirishda xatolik', stage: 'polling' });
      }
    };

    void poll();
    importPollRef.current = setInterval(poll, 2500);
  };

  const handlePdfImport = async (): Promise<void> => {
    if (!pdfTitle.trim() || !pdfFile) {
      toast.error('Test nomini va PDF faylni tanlang');
      return;
    }

    if (!session?.access_token) {
      toast.error('Iltimos, qayta login qiling');
      return;
    }

    if (!pdfFile.name.toLowerCase().endsWith('.pdf')) {
      toast.error("Faqat PDF formatdagi fayl qabul qilinadi (.pdf)");
      return;
    }

    if (pdfFile.size > MAX_PDF_SIZE) {
      toast.error(`PDF hajmi 20MB dan oshmasligi kerak (sizniki: ${(pdfFile.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }
    if (pdfFile.size < 1024) {
      toast.error("PDF juda kichik yoki bo'sh ko'rinadi");
      return;
    }

    setImportError(null);
    setImportJob(null);
    setImportAttempt(1);
    setImporting(true);
    setImportStage(1);
    try {
      const header = new Uint8Array(await pdfFile.slice(0, 4).arrayBuffer());
      if (header[0] !== 0x25 || header[1] !== 0x50 || header[2] !== 0x44 || header[3] !== 0x46) {
        throw Object.assign(new Error('Fayl haqiqiy PDF formatida emas'), { stage: 'validate-format' });
      }

      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('title', pdfTitle.trim());
      formData.append('subject', pdfSubject);
      formData.append('duration_minutes', String(Math.min(240, Math.max(5, pdfDuration))));
      if (pdfAccessCode.trim()) {
        formData.append('access_code', pdfAccessCode.trim());
      }
      if (pdfAnswerKeys.trim()) {
        formData.append('answer_keys', pdfAnswerKeys.trim());
      }
      if (pdfAnswerKeyImage) {
        formData.append('answer_key_image', pdfAnswerKeyImage);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-pdf-to-test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const rawResponse = await response.text();
      let data: any = {};
      try { data = rawResponse ? JSON.parse(rawResponse) : {}; }
      catch { data = { error: `Server javobi JSON emas: ${rawResponse.slice(0, 200)}` }; }

      if (!response.ok) {
        const err: any = new Error(data?.error || `HTTP ${response.status}`);
        err.status = response.status;
        err.stage = data?.stage;
        err.debug = data?.debug;
        throw err;
      }

      setImportJob({
        id: data.job_id,
        title: pdfTitle.trim(),
        status: data.status || 'queued',
        stage: 'queued',
        progress: 8,
        attempt_count: 0,
        max_attempts: 2,
        error_message: null,
        error_stage: null,
        debug: null,
        result_test_id: null,
        questions_count: null,
      });
      toast.success('PDF yuklandi. AI savollarni fonda yaratmoqda.');
      pollPdfImportJob(data.job_id, pdfTitle.trim());
    } catch (error: any) {
      setImportStage(0);
      setImporting(false);

      const isAbort = error?.name === 'AbortError';
      const message = isAbort
        ? 'PDF yuklash javobi kechikdi. Internetni tekshirib qayta urinib ko\'ring.'
        : (error.message || 'Import xatoligi');
      setImportError({ message, stage: error?.stage, debug: error?.debug, attempt: 1 });
      toast.error(message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Faqat PDF fayl yuklash mumkin');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_PDF_SIZE) {
      toast.error('PDF hajmi 20MB dan oshmasligi kerak');
      e.target.value = '';
      return;
    }

    setPdfFile(file);
    if (!pdfTitle) {
      setPdfTitle(file.name.replace(/\.pdf$/i, ''));
    }
  };

  const handleAddQuestion = async () => {
    if (!selectedTest || !newQuestionText.trim()) {
      toast.error('Savol matnini kiriting');
      return;
    }

    const filledChoices = newChoices.filter(c => c.text.trim());
    if (filledChoices.length < 2) {
      toast.error('Kamida 2 ta javob varianti kerak');
      return;
    }

    if (!filledChoices.some(c => c.isCorrect)) {
      toast.error('Kamida bitta to\'g\'ri javob belgilang');
      return;
    }

    setSaving(true);

    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .insert({
        test_id: selectedTest.id,
        question_text: newQuestionText.trim(),
        order_index: questions.length,
      })
      .select()
      .single();

    if (questionError) {
      toast.error('Savol qo\'shishda xatolik');
      setSaving(false);
      return;
    }

    const choicesData = filledChoices.map((c, idx) => ({
      question_id: questionData.id,
      choice_text: c.text.trim(),
      is_correct: c.isCorrect,
      order_index: idx,
    }));

    await supabase.from('choices').insert(choicesData);

    toast.success('Savol qo\'shildi');
    resetQuestionForm();
    fetchQuestions(selectedTest.id);
    fetchStats();
    setSaving(false);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Savolni o\'chirishni tasdiqlaysizmi?')) return;
    
    await supabase.from('questions').delete().eq('id', questionId);
    toast.success('Savol o\'chirildi');
    if (selectedTest) {
      fetchQuestions(selectedTest.id);
    }
    fetchStats();
  };

  const handleTogglePublish = async (test: Test) => {
    if (!test.is_published && (test.question_count || 0) === 0) {
      toast.error('Nashr qilish uchun kamida 1 ta savol kerak');
      return;
    }

    await supabase.from('tests').update({ is_published: !test.is_published }).eq('id', test.id);
    fetchTests();
    toast.success(test.is_published ? 'Test yashirildi' : 'Test nashr qilindi');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Testni o\'chirishni tasdiqlaysizmi?')) return;
    await supabase.from('tests').delete().eq('id', id);
    fetchTests();
    fetchStats();
    toast.success('Test o\'chirildi');
  };

  const handleToggleUserBlock = async (userProfile: UserProfile) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: !userProfile.is_blocked })
      .eq('id', userProfile.id);

    if (error) {
      toast.error('Xatolik yuz berdi');
      return;
    }

    toast.success(userProfile.is_blocked ? 'Foydalanuvchi blokdan chiqarildi' : 'Foydalanuvchi bloklandi');
    fetchUsers();
  };

  const handleChangeUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    await supabase.from('user_roles').delete().eq('user_id', userId);
    
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: newRole });

    if (error) {
      toast.error('Xatolik yuz berdi');
      return;
    }

    toast.success(`Foydalanuvchi roli ${newRole === 'admin' ? 'Admin' : 'Foydalanuvchi'}ga o'zgartirildi`);
    fetchUsers();
  };

  const openEditDialog = (test: Test) => {
    setEditingTest(test);
    setTitle(test.title);
    setDescription(test.description || '');
    setSubject(test.subject);
    setDuration(test.duration_minutes);
    setAccessCode(test.access_code || '');
    setDialogOpen(true);
  };

  const openQuestionDialog = async (test: Test) => {
    setSelectedTest(test);
    await fetchQuestions(test.id);
    setQuestionDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTest(null);
    setTitle('');
    setDescription('');
    setSubject('math');
    setDuration(30);
    setAccessCode('');
  };

  const resetPdfForm = () => {
    setPdfTitle('');
    setPdfSubject('math');
    setPdfDuration(30);
    setPdfAccessCode('');
    setPdfFile(null);
    setPdfAnswerKeys('');
    setPdfAnswerKeyImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (answerKeyImageRef.current) answerKeyImageRef.current.value = '';
  };

  const resetQuestionForm = () => {
    setNewQuestionText('');
    setNewChoices([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
  };

  const updateChoice = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    setNewChoices(prev => prev.map((c, i) => {
      if (i === index) {
        if (field === 'isCorrect' && value === true) {
          return { ...c, isCorrect: true };
        }
        return { ...c, [field]: value };
      }
      if (field === 'isCorrect' && value === true) {
        return { ...c, isCorrect: false };
      }
      return c;
    }));
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-600"><Crown className="h-3 w-3 mr-1" />Super Admin</Badge>;
      case 'admin':
        return <Badge variant="secondary"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      default:
        return <Badge variant="outline">Foydalanuvchi</Badge>;
    }
  };

  const toggleShowAccessCode = (testId: string) => {
    setShowAccessCode(prev => ({ ...prev, [testId]: !prev[testId] }));
  };

  if (!isAdmin) {
    return (
      <Layout>
        <PageTransition>
          <div className="container py-16 text-center">
            <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="font-serif text-2xl font-bold mb-2">Ruxsat yo'q</h1>
            <p className="text-muted-foreground">Bu sahifaga kirish uchun admin huquqi kerak</p>
          </div>
        </PageTransition>
      </Layout>
    );
  }

  return (
    <Layout>
      
      <PageTransition>
        <div className="container relative py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 animate-fade-up">
            <div className="flex items-center gap-4">
              {isSuperAdmin ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl">
                  <Crown className="h-8 w-8" />
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-primary/10">
                  <LayoutDashboard className="h-8 w-8 text-primary" />
                </div>
              )}
              <div>
                <h1 className="font-serif text-3xl font-bold">
                  {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
                </h1>
                <p className="text-muted-foreground">Testlar, savollar va foydalanuvchilarni boshqarish</p>
              </div>
            </div>
            
            <div className="flex gap-3">

              {/* New Test Button */}
              <Button variant="premium" size="lg" onClick={() => setDialogOpen(true)}>
                <Plus className="h-5 w-5 mr-2" />
                Yangi test
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={cn("grid w-full", isSuperAdmin ? "grid-cols-4" : "grid-cols-3")}>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Statistika
              </TabsTrigger>
              <TabsTrigger value="tests" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Testlar
              </TabsTrigger>
              <TabsTrigger value="books" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Kitoblar
              </TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Foydalanuvchilar
                </TabsTrigger>
              )}
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Testlar', value: stats.tests, icon: BookOpen, gradient: 'from-blue-500 to-indigo-600' },
                  { label: 'Savollar', value: stats.questions, icon: FileQuestion, gradient: 'from-amber-500 to-orange-600' },
                  { label: 'Foydalanuvchilar', value: stats.users, icon: Users, gradient: 'from-emerald-500 to-teal-600' },
                  { label: 'Urinishlar', value: stats.attempts, icon: TrendingUp, gradient: 'from-purple-500 to-pink-600' },
                  { label: "O'rtacha ball", value: `${stats.avgScore}%`, icon: Target, gradient: 'from-rose-500 to-red-600' },
                ].map((stat, idx) => (
                  <Card key={stat.label} className="card-premium animate-fade-up" style={{ animationDelay: `${idx * 100}ms` }}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="text-3xl font-serif font-bold mt-1">{stat.value}</p>
                        </div>
                        <div className={cn("p-3 rounded-xl bg-gradient-to-br text-white", stat.gradient)}>
                          <stat.icon className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="card-premium animate-fade-up delay-500">
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    Eng ko'p ishlangan testlar
                  </CardTitle>
                  <CardDescription>Foydalanuvchilar tomonidan eng ko'p ishlangan 5 ta test</CardDescription>
                </CardHeader>
                <CardContent>
                  {topTests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Hali test urinishlari yo'q
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {topTests.map((test, idx) => {
                        const sub = getSubjectById(test.subject);
                        return (
                          <div key={test.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card/50 hover:bg-muted/50 transition-all">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold">
                              {idx + 1}
                            </div>
                             <SubjectIcon subjectId={test.subject} size={32} />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold truncate">{test.title}</h4>
                              <p className="text-sm text-muted-foreground">{sub?.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{test.attempt_count}</p>
                              <p className="text-xs text-muted-foreground">urinish</p>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "font-bold text-lg",
                                test.avg_score >= 80 ? "text-success" : test.avg_score >= 60 ? "text-warning" : "text-destructive"
                              )}>
                                {test.avg_score}%
                              </p>
                              <p className="text-xs text-muted-foreground">o'rtacha</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tests Tab */}
            <TabsContent value="tests">
              <Card className="card-premium animate-fade-up">
                <CardHeader>
                  <CardTitle className="font-serif">Barcha testlar</CardTitle>
                  <CardDescription>Testlarni tahrirlash, savol qo'shish va nashr qilish</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : tests.length === 0 ? (
                    <div className="text-center py-16">
                      <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-serif text-xl font-semibold mb-2">Hali testlar yo'q</h3>
                      <p className="text-muted-foreground mb-6">Birinchi testingizni yarating</p>
                      <Button variant="premium" onClick={() => setDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Yangi test
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tests.map((test) => {
                        const sub = getSubjectById(test.subject);
                        return (
                          <div 
                            key={test.id} 
                            className="flex items-center gap-4 p-4 rounded-xl border bg-card/50 backdrop-blur-sm hover:shadow-md transition-all"
                          >
                             <SubjectIcon subjectId={test.subject} size={44} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-serif font-semibold text-lg truncate">{test.title}</h3>
                                {test.access_code && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Lock className="h-3 w-3" />
                                    Kodli
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {sub?.name} • {test.question_count} savol • {test.duration_minutes} daqiqa
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {test.attempt_count} urinish • O'rtacha: {test.avg_score}%
                              </p>
                              {test.access_code && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">Kod:</span>
                                  <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                    {showAccessCode[test.id] ? test.access_code : '••••••'}
                                  </code>
                                  <button 
                                    onClick={() => toggleShowAccessCode(test.id)}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    {showAccessCode[test.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Switch 
                                  checked={test.is_published} 
                                  onCheckedChange={() => handleTogglePublish(test)} 
                                />
                                <span className={cn(
                                  "text-sm font-medium",
                                  test.is_published ? "text-success" : "text-muted-foreground"
                                )}>
                                  {test.is_published ? 'Nashr' : 'Qoralama'}
                                </span>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openQuestionDialog(test)}
                              >
                                <FileQuestion className="h-4 w-4 mr-1" />
                                Savollar
                              </Button>
                              {isSuperAdmin && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={() => openEditDialog(test)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="icon"
                                    onClick={() => handleDelete(test.id)}
                                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Books Tab */}
            <TabsContent value="books">
              <BooksAdmin />
            </TabsContent>

            {/* Users Tab */}
            {isSuperAdmin && (
              <TabsContent value="users">
                <Card className="card-premium animate-fade-up">
                  <CardHeader>
                    <CardTitle className="font-serif flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Foydalanuvchilarni boshqarish
                    </CardTitle>
                    <CardDescription>Foydalanuvchilarni bloklash va rollarini o'zgartirish</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Foydalanuvchi</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Holat</TableHead>
                          <TableHead>Ro'yxatdan o'tgan</TableHead>
                          <TableHead className="text-right">Amallar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((userProfile) => (
                          <TableRow key={userProfile.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                                  {userProfile.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium">{userProfile.full_name}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(userProfile.role || 'user')}</TableCell>
                            <TableCell>
                              {userProfile.is_blocked ? (
                                <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Bloklangan</Badge>
                              ) : (
                                <Badge variant="outline" className="text-success border-success"><UserCheck className="h-3 w-3 mr-1" />Faol</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(userProfile.created_at).toLocaleDateString('uz-UZ')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {userProfile.role !== 'super_admin' && (
                                  <>
                                    <Select
                                      value={userProfile.role || 'user'}
                                      onValueChange={(value) => handleChangeUserRole(userProfile.user_id, value as 'admin' | 'user')}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="user">Foydalanuvchi</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant={userProfile.is_blocked ? "outline" : "destructive"}
                                      size="sm"
                                      onClick={() => handleToggleUserBlock(userProfile)}
                                    >
                                      {userProfile.is_blocked ? (
                                        <><UserCheck className="h-4 w-4 mr-1" />Blokdan chiqarish</>
                                      ) : (
                                        <><Ban className="h-4 w-4 mr-1" />Bloklash</>
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Question Dialog */}
        <Dialog open={questionDialogOpen} onOpenChange={(open) => { 
          setQuestionDialogOpen(open); 
          if (!open) {
            setSelectedTest(null);
            resetQuestionForm();
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">
                {selectedTest?.title} - Savollar
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="list" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">Savollar ro'yxati ({questions.length})</TabsTrigger>
                <TabsTrigger value="add">Yangi savol qo'shish</TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[500px] pr-4">
                  {questions.length === 0 ? (
                    <div className="text-center py-12">
                      <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Hali savollar yo'q</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {questions.map((question, idx) => (
                        <Card key={question.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium mb-3">{question.question_text}</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {question.choices.map((choice) => (
                                    <div 
                                      key={choice.id}
                                      className={cn(
                                        "flex items-center gap-2 p-2 rounded-lg text-sm",
                                        choice.is_correct 
                                          ? "bg-success/10 text-success border border-success/30" 
                                          : "bg-muted"
                                      )}
                                    >
                                      {choice.is_correct ? (
                                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                      ) : (
                                        <XCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                      )}
                                      <span className="truncate">{choice.choice_text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteQuestion(question.id)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="add" className="flex-1 overflow-auto">
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>Savol matni</Label>
                    <Textarea
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="Savolni kiriting..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <Label>Javob variantlari (to'g'ri javobni belgilang)</Label>
                    {newChoices.map((choice, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                          choice.isCorrect 
                            ? "bg-success text-success-foreground" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <Input
                          value={choice.text}
                          onChange={(e) => updateChoice(idx, 'text', e.target.value)}
                          placeholder={`${idx + 1}-variant`}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant={choice.isCorrect ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateChoice(idx, 'isCorrect', true)}
                          className={choice.isCorrect ? "bg-success hover:bg-success/90" : ""}
                        >
                          {choice.isCorrect ? <CheckCircle className="h-4 w-4" /> : "To'g'ri"}
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    variant="premium" 
                    onClick={handleAddQuestion} 
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Savolni qo'shish
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        <ImportPreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          testId={importedTestId}
          testTitle={importedTestTitle}
          questionsCount={importedQuestionsCount}
          onPublished={() => { fetchTests(); fetchStats(); }}
        />

        <ManualTestCreator
          open={dialogOpen}
          onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}
          userId={user!.id}
          isSuperAdmin={isSuperAdmin}
          onCreated={() => { fetchTests(); fetchStats(); }}
        />
      </PageTransition>
    </Layout>
  );
}
