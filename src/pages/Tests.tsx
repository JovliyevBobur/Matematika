import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PageTransition } from '@/components/PageTransition';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Clock, FileQuestion, Loader2, Play, Lock, ArrowRight, Calculator, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { cacheData, getCachedData } from '@/lib/cache';

interface Test {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  is_published: boolean;
  access_code: string | null;
  question_count?: number;
}

export default function Tests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [selectedCoded, setSelectedCoded] = useState<Test | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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
    (async () => {
      setLoading(true);
      try {
        if (!navigator.onLine) {
          const cached = await getCachedData<Test[]>('tests_list');
          if (cached) {
            setTests(cached);
            toast.info('Oflayn rejim: Keshlangan testlar ko\'rsatilmoqda');
          } else {
            toast.error('Oflayn rejim: Keshlangan testlar topilmadi');
          }
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from('tests')
          .select('id, title, description, duration_minutes, is_published, access_code')
          .eq('subject', 'math')
          .eq('is_published', true)
          .order('created_at', { ascending: false });
        
        if (data) {
          const withCounts = await Promise.all(
            data.map(async (t) => {
              const { count } = await supabase
                .from('questions')
                .select('*', { count: 'exact', head: true })
                .eq('test_id', t.id);
              return { ...t, question_count: count || 0 };
            })
          );
          setTests(withCounts);
          await cacheData('tests_list', withCounts);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        const cached = await getCachedData<Test[]>('tests_list');
        if (cached) setTests(cached);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const start = (t: Test) => {
    if (!user) {
      toast.error('Test ishlash uchun tizimga kiring');
      navigate('/login', { state: { from: { pathname: `/test/${t.id}` } } });
      return;
    }
    navigate(`/test/${t.id}`);
  };

  const verifyCode = async () => {
    if (!enteredCode.trim()) return;
    setVerifying(true);
    const { data } = await supabase
      .from('tests')
      .select('id')
      .eq('access_code', enteredCode.trim())
      .eq('is_published', true)
      .maybeSingle();
    setVerifying(false);
    if (!data) {
      toast.error("Bunday kodli test topilmadi");
      return;
    }
    setCodeDialogOpen(false);
    setEnteredCode('');
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/test/${data.id}` } } });
    } else {
      navigate(`/test/${data.id}`);
    }
  };

  const filtered = tests.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <Layout>
      <PageTransition>
        <div className="container py-8 md:py-12">
          <div className="text-center mb-10 animate-fade-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white mb-4">
              <Calculator className="h-8 w-8" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-3 flex items-center justify-center gap-3">
              Matematika <span className="text-gradient-gold">testlari</span>
              {isOffline && <WifiOff className="h-6 w-6 text-muted-foreground ml-2" />}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Eng yaxshi matematika testlari bilan bilimingizni sinab ko'ring
              {isOffline && <span className="block text-sm text-warning mt-1">Siz oflayn rejimdasiz</span>}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Test nomini qidiring..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-12 h-12"
              />
            </div>
            <Button variant="outline" className="h-12" onClick={() => { setSelectedCoded(null); setCodeDialogOpen(true); }}>
              <Lock className="h-4 w-4 mr-2" /> Maxfiy kod
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <Card className="card-premium text-center py-16">
              <CardContent>
                <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-serif text-xl font-semibold mb-2">Hali testlar yo'q</h3>
                <p className="text-muted-foreground">Tez orada yangi testlar qo'shiladi</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((t, i) => (
                <Card key={t.id} className="card-premium hover:-translate-y-1 transition-all animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <CardHeader>
                    <CardTitle className="font-serif text-lg">{t.title}</CardTitle>
                    {t.description && <CardDescription className="line-clamp-2">{t.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1"><FileQuestion className="h-4 w-4" />{t.question_count} savol</span>
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{t.duration_minutes} daqiqa</span>
                    </div>
                    <Button
                      variant="premium"
                      className="w-full"
                      onClick={() => {
                        if (t.access_code) { setSelectedCoded(t); setCodeDialogOpen(true); }
                        else start(t);
                      }}
                    >
                      {t.access_code ? (<><Lock className="h-4 w-4 mr-2" />Kodni kiritish</>) : (<><Play className="h-4 w-4 mr-2" />Testni boshlash</>)}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif flex items-center gap-2"><Lock className="h-5 w-5" />Maxfiy test kodi</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label>Kirish kodi</Label>
              <Input value={enteredCode} onChange={e => setEnteredCode(e.target.value.toUpperCase())} placeholder="Masalan: MATH2024" className="h-12 text-lg font-mono text-center tracking-widest" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCodeDialogOpen(false)}>Bekor</Button>
              <Button variant="premium" onClick={() => selectedCoded ? (async () => {
                setVerifying(true);
                const { data } = await supabase.from('tests').select('id').eq('id', selectedCoded.id).eq('access_code', enteredCode.trim()).maybeSingle();
                setVerifying(false);
                if (!data) { toast.error("Kod noto'g'ri"); return; }
                setCodeDialogOpen(false); setEnteredCode('');
                start(selectedCoded);
              })() : verifyCode()} disabled={verifying}>
                {verifying && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Testga kirish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </Layout>
  );
}