import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Loader2, AlertCircle, Mail, Lock, Sparkles, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicEmail, setMagicEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Iltimos, barcha maydonlarni to\'ldiring');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      setError('Email yoki parol noto\'g\'ri');
      return;
    }

    toast.success('Muvaffaqiyatli kirdingiz!');
    navigate(from, { replace: true });
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!magicEmail.trim()) {
      setError('Email manzilini kiriting');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);

    if (error) {
      setError('Xatolik yuz berdi. Qayta urinib ko\'ring.');
      return;
    }

    setMagicLinkSent(true);
    toast.success('Tasdiqlash havolasi emailingizga yuborildi!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
      
      <Card className="relative w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center pb-2">
          <Link to="/" className="inline-flex items-center justify-center gap-2 font-serif text-2xl font-bold mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="gradient-text">MockTest Pro</span>
          </Link>
          <CardTitle className="font-serif text-2xl">Xush kelibsiz!</CardTitle>
          <CardDescription>
            Hisobingizga kiring va testlarni davom ettiring
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Parol bilan
              </TabsTrigger>
              <TabsTrigger value="magic" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Magic Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Parol</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="premium" 
                  className="w-full h-11" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Kirish...
                    </>
                  ) : (
                    'Kirish'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="magic">
              {magicLinkSent ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-2">Havola yuborildi!</h3>
                  <p className="text-muted-foreground mb-4">
                    <strong>{magicEmail}</strong> manziliga tasdiqlash havolasi yuborildi.
                    Emailingizni tekshiring.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setMagicLinkSent(false)}
                  >
                    Boshqa email kiritish
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-accent mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground mb-1">Parolsiz kirish</p>
                        <p className="text-muted-foreground">
                          Emailingizga maxsus havola yuboramiz. 
                          Havolani bosib tizimga kiring.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="magicEmail">Email</Label>
                    <Input
                      id="magicEmail"
                      type="email"
                      placeholder="email@example.com"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      disabled={loading}
                      className="h-11"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    variant="premium" 
                    className="w-full h-11" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Yuborilmoqda...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Magic Link yuborish
                      </>
                    )}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Hisobingiz yo'qmi? </span>
            <Link to="/register" className="text-primary font-medium hover:underline">
              Ro'yxatdan o'ting
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
