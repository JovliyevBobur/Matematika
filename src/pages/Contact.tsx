import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Phone, MapPin, Send, MessageCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const contactInfo = [
  { icon: Mail, label: "Email", value: "mocktest@gmail.com", href: "mailto:mocktest@gmail.com" },
  { icon: Phone, label: "Telefon", value: "+998 90 123 45 67", href: "tel:+998901234567" },
  { icon: MapPin, label: "Manzil", value: "Toshkent, O'zbekiston", href: null },
  { icon: Clock, label: "Ish vaqti", value: "Dushanba-Juma, 9:00-18:00", href: null },
];

const faq = [
  { q: "Platforma bepulmi?", a: "Ha, MockTest platformasi barcha foydalanuvchilar uchun mutlaqo bepul." },
  { q: "Qanday fanlardan testlar bor?", a: "Matematika, Fizika, Kimyo, Biologiya, Tarix, Ingliz tili, Rus tili, O'zbek tili va Informatika — jami 9 ta fan." },
  { q: "Test natijalarini qaerdan ko'raman?", a: "Testni yakunlaganingizdan so'ng natijalar sahifasida ball, to'g'ri/noto'g'ri javoblar ko'rsatiladi. Dashboard bo'limida esa barcha natijalaringiz saqlanadi." },
  { q: "PDF orqali test yaratsa bo'ladimi?", a: "Ha, admin foydalanuvchilar PDF fayl yuklash orqali AI yordamida avtomatik test yaratishi mumkin." },
];

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Barcha maydonlarni to'ldiring");
      return;
    }
    setSending(true);
    // Simulate send
    await new Promise(r => setTimeout(r, 1500));
    toast.success("Xabaringiz muvaffaqiyatli yuborildi! Tez orada javob beramiz.");
    setName('');
    setEmail('');
    setMessage('');
    setSending(false);
  };

  return (
    <Layout>
      <div className="container py-12 space-y-16 max-w-5xl">
        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
            Biz bilan <span className="text-primary">bog'laning</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Savolingiz bormi? Taklifingiz bormi? Biz har doim yordam berishga tayyormiz!
          </p>
        </section>

        {/* Contact Info + Form */}
        <section className="grid md:grid-cols-5 gap-8">
          {/* Info */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xl font-serif font-bold text-foreground">Aloqa ma'lumotlari</h2>
            <div className="space-y-3">
              {contactInfo.map((c) => (
                <div key={c.label} className="flex items-start gap-3 p-3 bg-card border border-border/60 rounded-xl hover:border-primary/40 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <c.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    {c.href ? (
                      <a href={c.href} className="text-sm font-medium text-foreground hover:text-primary transition-colors">{c.value}</a>
                    ) : (
                      <p className="text-sm font-medium text-foreground">{c.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl space-y-2 mt-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Telegram</h3>
              </div>
              <p className="text-sm text-muted-foreground">Tezkor javob olish uchun Telegram orqali yozing:</p>
              <a href="https://t.me/mocktest_uz" target="_blank" rel="noopener noreferrer" className="text-sm text-primary font-medium hover:underline">
                @mocktest_uz
              </a>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-3">
            <div className="bg-card border border-border/60 rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-serif font-bold text-foreground">Xabar yuborish</h2>
                <p className="text-sm text-muted-foreground mt-1">Formani to'ldiring, biz tez orada javob beramiz</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Ismingiz</label>
                  <Input placeholder="To'liq ismingiz" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Xabar</label>
                  <Textarea placeholder="Xabaringizni yozing..." rows={5} value={message} onChange={e => setMessage(e.target.value)} />
                </div>
                <Button type="submit" variant="premium" className="w-full" disabled={sending}>
                  {sending ? "Yuborilmoqda..." : <>Yuborish <Send className="h-4 w-4 ml-2" /></>}
                </Button>
              </form>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-6">
          <h2 className="text-2xl font-serif font-bold text-foreground text-center">Ko'p beriladigan savollar</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {faq.map((f) => (
              <div key={f.q} className="bg-card border border-border/60 rounded-xl p-5 space-y-2 hover:border-primary/40 transition-colors">
                <h3 className="font-semibold text-foreground">{f.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
