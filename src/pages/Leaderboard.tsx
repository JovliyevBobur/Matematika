import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SUBJECTS } from '@/lib/constants';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_score: number;
  tests_completed: number;
  avg_score: number;
}

export default function Leaderboard() {
  const [activeSubject, setActiveSubject] = useState<string>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeSubject]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_subject: activeSubject === 'all' ? null : activeSubject as any,
      p_limit: 20,
    });

    if (!error && data) {
      setLeaderboard(data);
    }
    setLoading(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 dark:from-yellow-950/20 dark:to-amber-950/20';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 dark:from-gray-950/20 dark:to-slate-950/20';
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 dark:from-amber-950/20 dark:to-orange-950/20';
      default:
        return '';
    }
  };

  return (
    <Layout>
      <div className="container py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Reyting jadvali</h1>
          <p className="text-muted-foreground">
            Eng yaxshi natija ko'rsatgan foydalanuvchilar
          </p>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <Tabs value={activeSubject} onValueChange={setActiveSubject}>
              <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="all" className="flex-1 min-w-fit">
                  🏆 Umumiy
                </TabsTrigger>
                {SUBJECTS.map((subject) => (
                  <TabsTrigger key={subject.id} value={subject.id} className="flex-1 min-w-fit">
                    {subject.icon} {subject.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Hali hech kim test ishlamagan</h3>
                <p className="text-sm text-muted-foreground">
                  Birinchi bo'lib testni yakunlang va reytingda ko'rinish oling!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  
                  return (
                    <div
                      key={entry.user_id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-lg border transition-all hover:shadow-md",
                        getRankStyle(rank)
                      )}
                    >
                      <div className="flex items-center justify-center w-10">
                        {getRankIcon(rank)}
                      </div>
                      
                      <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                        <AvatarImage src={entry.avatar_url || ''} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {getInitials(entry.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{entry.full_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {entry.tests_completed} ta test • O'rtacha {entry.avg_score}%
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{entry.total_score}</p>
                        <p className="text-xs text-muted-foreground">ball</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
