import { Layout } from '@/components/layout/Layout';
import { BookOpen, Users, Target, Award, Zap, Globe, Shield, TrendingUp } from 'lucide-react';

const stats = [
  { label: "Fanlar", value: "9+", icon: BookOpen },
  { label: "Testlar", value: "270+", icon: Target },
  { label: "Savollar", value: "8000+", icon: Zap },
  { label: "Foydalanuvchilar", value: "1000+", icon: Users },
];

const values = [
  {
    icon: Target,
    title: "Aniq maqsad",
    description: "Har bir talabaga universitetga kirish imtihonlariga tayyorgarlik ko'rishda eng sifatli testlarni taqdim etish."
  },
  {
    icon: Award,
    title: "Sifat kafolati",
    description: "Barcha savollar mutaxassislar va AI tomonidan tayyorlanib, universitet darajasidagi murakkablikka ega."
  },
  {
    icon: Globe,
    title: "Hamma uchun ochiq",
    description: "Platformamiz barcha talabalar uchun bepul va ochiq. Internetga ulangan har qanday qurilmadan foydalanish mumkin."
  },
  {
    icon: Shield,
    title: "Xavfsizlik",
    description: "Foydalanuvchilar ma'lumotlari ishonchli himoyalangan. Zamonaviy shifrlash texnologiyalari qo'llaniladi."
  },
  {
    icon: TrendingUp,
    title: "Doimiy rivojlanish",
    description: "Har kuni yangi testlar qo'shilib, mavjud savollar yangilanib boradi. Sizning fikringiz biz uchun muhim."
  },
  {
    icon: Zap,
    title: "Tezkor natijalar",
    description: "Test yakunlangandan so'ng darhol natijalaringiz, to'g'ri javoblar tahlili va reyting ko'rsatiladi."
  },
];

const team = [
  { name: "MockTest jamoasi", role: "Dasturchilar & Dizaynerlar", desc: "Zamonaviy texnologiyalar yordamida eng qulay va samarali o'quv platformasini yaratish ustida ishlaymiz." },
  { name: "AI tizimi", role: "Sun'iy intellekt", desc: "Gemini Pro modeli yordamida PDF hujjatlardan avtomatik test yaratish va tahlil qilish imkoniyati." },
];

export default function About() {
  return (
    <Layout>
      <div className="container py-12 space-y-16 max-w-5xl">
        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
            Biz <span className="text-primary">haqimizda</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            MockTest — O'zbekiston talabalari uchun yaratilgan zamonaviy online test platformasi. 
            Universitetga kirish imtihonlariga tayyorgarlik ko'rishning eng samarali yo'li.
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card border border-border/60 rounded-xl p-6 text-center space-y-2 hover:shadow-lg transition-shadow">
              <s.icon className="h-8 w-8 text-primary mx-auto" />
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Mission */}
        <section className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-8 md:p-12 space-y-4">
          <h2 className="text-2xl font-serif font-bold text-foreground">Bizning maqsadimiz</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">
            Biz har bir talabaga sifatli ta'lim resurslariga teng kirish imkoniyatini yaratishni maqsad qilganmiz. 
            MockTest platformasi orqali siz 9 ta fandan minglab savollar bilan mashq qilishingiz, 
            bilimingizni sinovdan o'tkazishingiz va o'z natijalaringizni reyting tizimida kuzatishingiz mumkin.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            AI texnologiyalari yordamida doimiy ravishda yangi va sifatli testlar yaratilib, 
            platformamiz tobora boyib bormoqda.
          </p>
        </section>

        {/* Values */}
        <section className="space-y-6">
          <h2 className="text-2xl font-serif font-bold text-foreground text-center">Qadriyatlarimiz</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((v) => (
              <div key={v.title} className="bg-card border border-border/60 rounded-xl p-6 space-y-3 hover:border-primary/40 transition-colors">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <v.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="space-y-6">
          <h2 className="text-2xl font-serif font-bold text-foreground text-center">Jamoa</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {team.map((t) => (
              <div key={t.name} className="bg-card border border-border/60 rounded-xl p-6 space-y-2 hover:shadow-lg transition-shadow">
                <h3 className="font-semibold text-foreground text-lg">{t.name}</h3>
                <p className="text-sm text-primary font-medium">{t.role}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
