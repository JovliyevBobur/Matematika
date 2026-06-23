import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SUBJECTS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { SubjectIcon } from '@/components/SubjectIcon';
import { Plus, Trash2, CheckCircle, XCircle, Save, Loader2, Lock, BookOpen, FileQuestion, ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface ManualQuestion {
  text: string;
  explanation: string;
  choices: { text: string; isCorrect: boolean }[];
}

interface ManualTestCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  isSuperAdmin: boolean;
  onCreated: () => void;
}

export function ManualTestCreator({ open, onOpenChange, userId, isSuperAdmin, onCreated }: ManualTestCreatorProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('math');
  const [duration, setDuration] = useState(30);
  const [accessCode, setAccessCode] = useState('');
  const [questions, setQuestions] = useState<ManualQuestion[]>([]);
  const [saving, setSaving] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentExplanation, setCurrentExplanation] = useState('');
  const [currentChoices, setCurrentChoices] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSubject('math');
    setDuration(30);
    setAccessCode('');
    setQuestions([]);
    setCurrentQuestion('');
    setCurrentExplanation('');
    setCurrentChoices([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
    setStep(1);
  };

  const addQuestion = () => {
    if (!currentQuestion.trim()) {
      toast.error('Savol matnini kiriting');
      return;
    }
    const filled = currentChoices.filter(c => c.text.trim());
    if (filled.length < 2) {
      toast.error('Kamida 2 ta javob varianti kerak');
      return;
    }
    if (!filled.some(c => c.isCorrect)) {
      toast.error("To'g'ri javob belgilang");
      return;
    }

    setQuestions(prev => [...prev, {
      text: currentQuestion.trim(),
      explanation: currentExplanation.trim(),
      choices: filled.map(c => ({ text: c.text.trim(), isCorrect: c.isCorrect })),
    }]);
    setCurrentQuestion('');
    setCurrentExplanation('');
    setCurrentChoices([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
    toast.success(`Savol qo'shildi (${questions.length + 1})`);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateChoice = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    setCurrentChoices(prev => prev.map((c, i) => {
      if (i === index) {
        if (field === 'isCorrect' && value === true) return { ...c, isCorrect: true };
        return { ...c, [field]: value };
      }
      if (field === 'isCorrect' && value === true) return { ...c, isCorrect: false };
      return c;
    }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Test nomini kiriting');
      setStep(1);
      return;
    }
    if (questions.length === 0) {
      toast.error('Kamida 1 ta savol qo\'shing');
      setStep(2);
      return;
    }

    setSaving(true);
    try {
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          subject: subject as any,
          duration_minutes: duration,
          created_by: userId,
          is_published: true,
          access_code: accessCode.trim() || null,
        })
        .select('id')
        .single();

      if (testError || !testData) throw testError;

      const questionsPayload = questions.map((q, i) => ({
        test_id: testData.id,
        question_text: q.text,
        explanation: q.explanation || null,
        order_index: i,
      }));

      const { data: insertedQuestions, error: qError } = await supabase
        .from('questions')
        .insert(questionsPayload)
        .select('id, order_index');

      if (qError || !insertedQuestions) throw qError;

      const choicesPayload = questions.flatMap((q, qi) => {
        const questionId = insertedQuestions.find(iq => iq.order_index === qi)?.id;
        if (!questionId) return [];
        return q.choices.map((c, ci) => ({
          question_id: questionId,
          choice_text: c.text,
          is_correct: c.isCorrect,
          order_index: ci,
        }));
      });

      const { error: cError } = await supabase.from('choices').insert(choicesPayload);
      if (cError) throw cError;

      toast.success(`Test yaratildi! ${questions.length} ta savol bilan`);
      onOpenChange(false);
      resetForm();
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const selectedSubject = SUBJECTS.find(s => s.id === subject);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header with step indicator */}
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Yangi test yaratish
            </DialogTitle>
          </DialogHeader>
          
          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { num: 1, label: "Ma'lumot" },
              { num: 2, label: 'Savollar' },
              { num: 3, label: "Ko'rish" },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => setStep(s.num)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    step === s.num
                      ? "bg-primary text-primary-foreground shadow-md"
                      : step > s.num
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <span className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0",
                    step === s.num
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : step > s.num
                      ? "bg-success text-success-foreground"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  )}>
                    {step > s.num ? '✓' : s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {idx < 2 && <div className={cn("w-4 h-0.5 flex-shrink-0", step > s.num ? "bg-success" : "bg-border")} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* Step 1: Test Info */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-up">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Test nomi *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Masalan: Matematika - Algebra asoslari"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tavsif</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Test haqida qisqacha ma'lumot..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Fan</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            <SubjectIcon subjectId={s.id} size={18} /> {s.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Vaqt (daqiqa)</Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min={5}
                    max={240}
                    className="h-11"
                  />
                </div>
              </div>
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Kirish kodi (ixtiyoriy)
                  </Label>
                  <Input
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Masalan: MATH2024"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">Yopiq test yaratish uchun kod kiriting</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Add Questions */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-up">
              {/* Added questions list */}
              {questions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-muted-foreground">
                      Qo'shilgan savollar
                    </Label>
                    <Badge variant="secondary" className="font-mono">{questions.length} ta</Badge>
                  </div>
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-2 pr-2">
                      {questions.map((q, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{q.text}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {q.choices.map((c, ci) => (
                                <span key={ci} className={cn(
                                  "text-[11px] px-2 py-0.5 rounded-full",
                                  c.isCorrect 
                                    ? "bg-success/10 text-success font-medium" 
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {String.fromCharCode(65 + ci)}: {c.text}
                                </span>
                              ))}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                            onClick={() => removeQuestion(idx)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* New question form */}
              <Card className="border-2 border-dashed border-primary/20 bg-primary/[0.02]">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <FileQuestion className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">
                      {questions.length + 1}-savol
                    </Label>
                  </div>
                  
                  <Textarea
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    placeholder="Savolni kiriting..."
                    rows={2}
                    className="resize-none"
                  />

                  <Textarea
                    value={currentExplanation}
                    onChange={(e) => setCurrentExplanation(e.target.value)}
                    placeholder="Yechim yoki analiz (ixtiyoriy)..."
                    rows={2}
                    className="resize-none border-primary/20 bg-primary/5"
                  />
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Javob variantlari (to'g'ri javobni belgilang)</Label>
                    {currentChoices.map((choice, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateChoice(idx, 'isCorrect', true)}
                          className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs transition-all flex-shrink-0",
                            choice.isCorrect
                              ? "bg-success text-success-foreground shadow-sm ring-2 ring-success/30"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          {choice.isCorrect ? <CheckCircle className="h-4 w-4" /> : String.fromCharCode(65 + idx)}
                        </button>
                        <Input
                          value={choice.text}
                          onChange={(e) => updateChoice(idx, 'text', e.target.value)}
                          placeholder={`${String.fromCharCode(65 + idx)}-variant`}
                          className="flex-1 h-9 text-sm"
                        />
                        {currentChoices.length > 2 && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-destructive"
                            onClick={() => setCurrentChoices(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {currentChoices.length < 10 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 border-dashed"
                        onClick={() => setCurrentChoices(prev => [...prev, { text: '', isCorrect: false }])}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Variant qo'shish
                      </Button>
                    )}
                  </div>
                  
                  <Button onClick={addQuestion} className="w-full" variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Savolni qo'shish
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-up">
              {/* Test summary card */}
              <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <SubjectIcon subjectId={subject} size={44} />
                    <div className="flex-1">
                      <h3 className="font-serif font-bold text-lg">{title || 'Nomsiz test'}</h3>
                      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="secondary">{selectedSubject?.name}</Badge>
                        <Badge variant="secondary">⏱ {duration} daqiqa</Badge>
                        <Badge variant="secondary">📝 {questions.length} savol</Badge>
                        {accessCode && <Badge variant="outline" className="border-warning/30 text-warning">🔒 Kodli</Badge>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Questions preview */}
              <ScrollArea className="max-h-[350px]">
                <div className="space-y-3 pr-2">
                  {questions.map((q, idx) => (
                    <Card key={idx} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-2">{q.text}</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {q.choices.map((c, ci) => (
                                <div key={ci} className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs",
                                  c.isCorrect 
                                    ? "bg-success/10 text-success border border-success/20" 
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {c.isCorrect ? <CheckCircle className="h-3 w-3 flex-shrink-0" /> : <XCircle className="h-3 w-3 flex-shrink-0 opacity-40" />}
                                  {c.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t flex items-center gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Orqaga
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 && (
            <Button 
              onClick={() => {
                if (step === 1 && !title.trim()) {
                  toast.error('Test nomini kiriting');
                  return;
                }
                if (step === 2 && questions.length === 0) {
                  toast.error('Kamida 1 ta savol qo\'shing');
                  return;
                }
                setStep(step + 1);
              }}
              className="gap-2"
            >
              {step === 1 ? 'Savollar' : "Ko'rib chiqish"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <Button variant="premium" onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Test yaratish va saqlash
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
