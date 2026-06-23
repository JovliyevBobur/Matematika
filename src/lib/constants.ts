export type SubjectId = 'math';

export interface SubjectMeta {
  id: SubjectId;
  name: string;
  icon: string;
  iconType: 'emoji' | 'image';
  color: string;
}

export const SUBJECTS: SubjectMeta[] = [
  { id: 'math', name: 'Matematika', icon: '📐', iconType: 'emoji', color: 'subject-math' },
];

export const getSubjectById = (id: string) => SUBJECTS.find(s => s.id === id);

export const getSubjectColor = (id: string): string => {
  const colors: Record<string, string> = {
    math: 'bg-subject-math',
    physics: 'bg-subject-physics',
     chemistry: 'bg-subject-chemistry',
     biology: 'bg-subject-biology',
     informatics: 'bg-subject-informatics',
    english: 'bg-subject-english',
    history: 'bg-subject-history',
    russian: 'bg-subject-russian',
    uzbek: 'bg-subject-uzbek',
  };
  return colors[id] || 'bg-primary';
};

export const getSubjectBorderColor = (id: string): string => {
  const colors: Record<string, string> = {
    math: 'border-subject-math',
    physics: 'border-subject-physics',
     chemistry: 'border-subject-chemistry',
     biology: 'border-subject-biology',
     informatics: 'border-subject-informatics',
    english: 'border-subject-english',
    history: 'border-subject-history',
    russian: 'border-subject-russian',
    uzbek: 'border-subject-uzbek',
  };
  return colors[id] || 'border-primary';
};
