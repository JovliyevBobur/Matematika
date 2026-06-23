import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { PageTransition } from '@/components/PageTransition';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Download, Search, Loader2, FileText, Heart } from 'lucide-react';
import { toast } from 'sonner';

interface Book {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  page_count: number | null;
  cover_url: string | null;
  pdf_path: string;
  file_size_bytes: number | null;
  download_count: number;
}

export default function Books() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('books')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      setBooks(data || []);
      setLoading(false);
    })();
  }, []);

  const download = async (book: Book) => {
    if (!user) {
      toast.error('Kitob yuklab olish uchun tizimga kiring');
      navigate('/login', { state: { from: { pathname: '/books' } } });
      return;
    }
    try {
      setDownloading(book.id);
      const { data, error } = await supabase.storage.from('books').createSignedUrl(book.pdf_path, 60 * 10);
      if (error || !data?.signedUrl) throw error || new Error('No URL');
      // Trigger download
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = `${book.title}.pdf`;
      a.target = '_blank';
      document.body.appendChild(a); a.click(); a.remove();
      // Increment counter (best effort)
      await supabase.from('books').update({ download_count: book.download_count + 1 }).eq('id', book.id);
    } catch (e: any) {
      toast.error('Yuklab olishda xatolik: ' + (e?.message || ''));
    } finally {
      setDownloading(null);
    }
  };

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <PageTransition>
        <div className="container py-8 md:py-12">
          <div className="text-center mb-10 animate-fade-up">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white mb-4">
              <BookOpen className="h-8 w-8" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-3">
              Kitoblar <span className="text-gradient-gold">kutubxonasi</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Matematika bo'yicha tanlangan kitoblarni bepul yuklab oling
            </p>
          </div>

          <div className="relative max-w-xl mx-auto mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Kitob nomi yoki muallif..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-3 opacity-50" />
              <p>Hali kitoblar yo'q</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filtered.map((book, i) => (
                <Card
                  key={book.id}
                  className="card-premium overflow-hidden group hover:-translate-y-1 transition-all animate-fade-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="relative aspect-[3/4] bg-gradient-to-br from-muted to-muted-foreground/10 overflow-hidden">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <BookOpen className="h-16 w-16" />
                      </div>
                    )}
                    <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-rose-500 transition-colors">
                      <Heart className="h-4 w-4" />
                    </button>
                    <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-500 text-white border-0">YANGI</Badge>
                  </div>
                  <CardContent className="p-3 md:p-4">
                    <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1">{book.title}</h3>
                    {book.author && <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{book.author}</p>}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{book.page_count || '—'} varoq</span>
                      <span>{book.download_count} yuklab olindi</span>
                    </div>
                    <Button
                      variant="premium"
                      size="sm"
                      className="w-full"
                      onClick={() => download(book)}
                      disabled={downloading === book.id}
                    >
                      {downloading === book.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <><Download className="h-4 w-4 mr-2" />Yuklab olish</>
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