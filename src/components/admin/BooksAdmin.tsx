import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BookOpen, Plus, Trash2, Loader2, Upload, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

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
  is_published: boolean;
  created_at: string;
}

export function BooksAdmin() {
  const { user, isSuperAdmin } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [pageCount, setPageCount] = useState<number | ''>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('books').select('*').order('created_at', { ascending: false });
    setBooks((data as Book[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setTitle(''); setAuthor(''); setDescription(''); setPageCount('');
    setPdfFile(null); setCoverFile(null);
    if (pdfRef.current) pdfRef.current.value = '';
    if (coverRef.current) coverRef.current.value = '';
  };

  const save = async () => {
    if (!title.trim()) return toast.error("Sarlavhani kiriting");
    if (!pdfFile) return toast.error("PDF faylni tanlang");
    if (pdfFile.size > 100 * 1024 * 1024) return toast.error("PDF 100MB dan kichik bo'lishi kerak");
    if (!user) return;
    setSaving(true);
    try {
      // Upload PDF
      const pdfPath = `${user.id}/${Date.now()}-${pdfFile.name.replace(/[^\w.-]+/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('books').upload(pdfPath, pdfFile, {
        contentType: 'application/pdf', upsert: false,
      });
      if (upErr) throw upErr;

      // Upload cover (optional) -> use avatars bucket (public)
      let coverUrl: string | null = null;
      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        const coverPath = `book-covers/${user.id}/${Date.now()}.${ext}`;
        const { error: cErr } = await supabase.storage.from('avatars').upload(coverPath, coverFile, { upsert: false });
        if (!cErr) {
          const { data: pub } = supabase.storage.from('avatars').getPublicUrl(coverPath);
          coverUrl = pub.publicUrl;
        }
      }

      const { error: insErr } = await supabase.from('books').insert({
        title: title.trim(),
        author: author.trim() || null,
        description: description.trim() || null,
        page_count: typeof pageCount === 'number' ? pageCount : null,
        cover_url: coverUrl,
        pdf_path: pdfPath,
        file_size_bytes: pdfFile.size,
        created_by: user.id,
      });
      if (insErr) throw insErr;

      toast.success("Kitob qo'shildi");
      setOpen(false); reset(); load();
    } catch (e: any) {
      toast.error("Xatolik: " + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: Book) => {
    if (!confirm(`"${b.title}" o'chirilsinmi?`)) return;
    await supabase.storage.from('books').remove([b.pdf_path]);
    await supabase.from('books').delete().eq('id', b.id);
    toast.success("O'chirildi");
    load();
  };

  return (
    <Card className="card-premium animate-fade-up">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-serif flex items-center gap-2"><BookOpen className="h-5 w-5" />Kitoblar kutubxonasi</CardTitle>
          <CardDescription>PDF kitoblarni yuklang — foydalanuvchilar yuklab oladi</CardDescription>
        </div>
        {isSuperAdmin && (
          <Button variant="premium" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Yangi kitob</Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : books.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />Hali kitoblar yo'q</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map(b => (
              <Card key={b.id} className="overflow-hidden">
                <div className="aspect-[3/4] bg-muted relative">
                  {b.cover_url ? <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" /> :
                    <div className="flex items-center justify-center h-full"><BookOpen className="h-12 w-12 text-muted-foreground" /></div>}
                </div>
                <CardContent className="p-3 space-y-2">
                  <h4 className="font-semibold line-clamp-1">{b.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">{b.author || '—'}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{b.page_count || '—'} varoq</span>
                    <span className="flex items-center gap-1"><Download className="h-3 w-3" />{b.download_count}</span>
                  </div>
                  {isSuperAdmin && (
                    <Button variant="destructive" size="sm" className="w-full" onClick={() => remove(b)}>
                      <Trash2 className="h-3 w-3 mr-1" />O'chirish
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">Yangi kitob qo'shish</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Sarlavha *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
            <div><Label>Muallif</Label><Input value={author} onChange={e => setAuthor(e.target.value)} /></div>
            <div><Label>Tavsif</Label><Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} /></div>
            <div><Label>Varoq soni</Label><Input type="number" value={pageCount} onChange={e => setPageCount(e.target.value ? parseInt(e.target.value) : '')} /></div>
            <div>
              <Label>Muqova rasmi (ixtiyoriy)</Label>
              <Input ref={coverRef} type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <Label>PDF fayl * <span className="text-xs text-muted-foreground">(max 100MB)</span></Label>
              <Input ref={pdfRef} type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
              {pdfFile && <p className="text-xs text-muted-foreground mt-1">{(pdfFile.size / 1024 / 1024).toFixed(1)} MB</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
            <Button variant="premium" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}Yuklash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}