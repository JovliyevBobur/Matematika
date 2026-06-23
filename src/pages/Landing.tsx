import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { PageTransition } from '@/components/PageTransition';

import { CheckCircle, BookOpen, Trophy, Clock, Users, TrendingUp, Rocket, ArrowRight, Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import logoImg from '@/assets/logo.png';
import mathGoBg from '@/assets/math_go_bg.png';

export default function Landing() {
  const { data: stats } = useQuery({
    queryKey: ['landing-stats'],
    queryFn: async () => {
      const [{ count: userCount }, { count: questionCount }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('questions').select('*', { count: 'exact', head: true }),
      ]);
      return { users: userCount ?? 0, questions: questionCount ?? 0 };
    },
  });

  const features = [
    {
      icon: BookOpen,
      title: "Matematika bo'yicha testlar",
      description: "Cheksiz miqdordagi savollar va kuchli yechimlar bilan",
    },
    {
      icon: Clock,
      title: "Vaqt cheklovi",
      description: "Har bir test uchun real imtihon sharoitida mashq qiling",
    },
    {
      icon: Trophy,
      title: "Reyting jadvali",
      description: "O'z natijalaringizni boshqalar bilan solishtiring",
    },
    {
      icon: TrendingUp,
      title: "Batafsil statistika",
      description: "O'z rivojlanishingizni kuzatib boring",
    },
  ];

  return (
    <Layout>
      
      <PageTransition>
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-[#0A0D18]">
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-screen"
            style={{ backgroundImage: `url(${mathGoBg})` }}
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0A0D18]/80 via-transparent to-background" />
          <div className="container relative z-10 py-20">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto px-4">
              {/* Heading */}
              <h1 className="font-serif text-[4.5rem] leading-none sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight mb-6 animate-fade-up text-white drop-shadow-2xl">
                Math <span className="text-[#E2B714]">Go</span>
              </h1>
              
              {/* Description */}
              <p className="text-xl md:text-3xl text-white/90 font-medium mb-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                Math is easy with Math Go
              </p>
              
              <p className="text-base sm:text-lg md:text-xl text-white/70 max-w-2xl mb-12 animate-fade-up leading-relaxed px-2" style={{ animationDelay: '0.2s' }}>
                Matematikani zamonaviy, qiziqarli va professional darajada o'rganing. 
                Minglab savollar, tez natijalar, va interaktiv kosmik tajriba.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-4 animate-fade-up px-4" style={{ animationDelay: '0.3s' }}>
                <Link to="/register" className="w-full sm:w-auto">
                  <Button variant="premium" size="xl" className="group w-full sm:w-auto h-14 sm:h-12">
                    <Rocket className="h-5 w-5 mr-2 group-hover:animate-bounce" />
                    Bepul boshlash
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/subjects" className="w-full sm:w-auto">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto h-14 sm:h-12 border-2 hover:bg-card/50 backdrop-blur-sm text-white border-white/20 hover:text-white">
                    Fanlarni ko'rish
                  </Button>
                </Link>
              </div>

              {/* Stats - Only two cards like in reference image */}
              <div className="flex flex-wrap justify-center gap-6 mt-16 animate-fade-up" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-4 px-8 py-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white">
                  <Users className="h-7 w-7 text-accent" />
                  <div className="text-left">
                    <p className="font-serif text-2xl font-bold">{stats?.users?.toLocaleString() ?? '0'}</p>
                    <p className="text-sm text-muted-foreground">foydalanuvchi</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 px-8 py-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white">
                  <BookOpen className="h-7 w-7 text-accent" />
                  <div className="text-left">
                    <p className="font-serif text-2xl font-bold">{stats?.questions?.toLocaleString() ?? '0'}</p>
                    <p className="text-sm text-muted-foreground">savollar</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 relative bg-card/50 backdrop-blur-sm">
          <div className="container relative">
            <div className="text-center mb-16">
              <p className="text-sm font-medium tracking-widest text-accent uppercase mb-3 animate-fade-up">Imkoniyatlar</p>
              <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6 animate-fade-up delay-100">
                Nima uchun <span className="text-gradient-gold">Math Go</span>?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-up delay-200">
                Eng zamonaviy texnologiyalar bilan qurilgan platforma sizga eng yaxshi natijalarni kafolatlaydi
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group card-premium p-8 text-center hover:-translate-y-2 transition-all duration-500 animate-fade-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 text-accent mb-6 group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300 group-hover:scale-110">
                    <feature.icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-serif text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative">
          <div className="container">
            <div className="relative rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-90" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
              
              <div className="relative px-8 py-20 text-center text-white">
                <Award className="h-16 w-16 mx-auto mb-6 opacity-80 animate-cosmic-float" />
                <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6">
                  Hoziroq boshlang!
                </h2>
                <p className="text-xl opacity-90 max-w-2xl mx-auto mb-10">
                  Ro'yxatdan o'ting va birinchi testingizni bepul ishlang. 
                  Muvaffaqiyat yo'lida birinchi qadamni qo'ying.
                </p>
                <Link to="/register">
                  <Button size="xl" variant="gold" className="font-bold text-lg hover:scale-105 transition-transform">
                    Bepul ro'yxatdan o'tish
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t bg-card/50 backdrop-blur-sm">
          <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 font-serif text-xl font-bold">
              <img src={logoImg} alt="Math Go Logo" className="h-10 w-10 rounded-xl" />
              <span>Math Go</span>
            </div>
            <p className="text-muted-foreground">
              © 2025 Math Go. Barcha huquqlar himoyalangan.
            </p>
          </div>
        </footer>
      </PageTransition>
    </Layout>
  );
}
