import { cn } from '@/lib/utils';
import { Upload, Brain, Save, CheckCircle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export type ImportStage = 0 | 1 | 2 | 3 | 4;

const stages = [
  { icon: Upload, label: 'PDF yuklanmoqda', description: 'Fayl serverga yuborilmoqda...' },
  { icon: Brain, label: 'AI tahlil qilmoqda', description: 'Savollar va javoblar ajratilmoqda...' },
  { icon: Save, label: 'Savollar saqlanmoqda', description: 'Ma\'lumotlar bazaga yozilmoqda...' },
  { icon: CheckCircle, label: 'Tayyor!', description: 'Import muvaffaqiyatli yakunlandi' },
];

interface ImportProgressBarProps {
  stage: ImportStage;
  progress?: number;
  status?: string;
}

export function ImportProgressBar({ stage, progress, status }: ImportProgressBarProps) {
  if (stage === 0) return null;

  const progressValue = typeof progress === 'number' ? progress : (stage === 4 ? 100 : ((stage - 1) / 3) * 100 + 15);

  return (
    <div className="space-y-4 p-4 rounded-xl border bg-muted/30 animate-fade-up">
      <Progress value={progressValue} className="h-2" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Status: {status || stages[stage - 1]?.label}</span>
        <span>{Math.round(progressValue)}%</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {stages.map((s, idx) => {
          const stageNum = idx + 1;
          const isActive = stage === stageNum;
          const isDone = stage > stageNum;
          const Icon = s.icon;

          return (
            <div
              key={idx}
              className={cn(
                "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all text-center",
                isActive && "bg-primary/10 scale-105",
                isDone && "opacity-60",
                !isActive && !isDone && "opacity-30"
              )}
            >
              <div className={cn(
                "p-2 rounded-full",
                isActive && "bg-primary text-primary-foreground",
                isDone && "bg-success text-success-foreground",
                !isActive && !isDone && "bg-muted text-muted-foreground"
              )}>
                {isActive && stageNum !== 4 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isDone ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span className={cn(
                "text-xs font-medium",
                isActive && "text-primary",
                isDone && "text-success"
              )}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      {stage < 4 && (
        <p className="text-sm text-muted-foreground text-center animate-pulse">
          {stages[stage - 1]?.description}
        </p>
      )}
    </div>
  );
}
