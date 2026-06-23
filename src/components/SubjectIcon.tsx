import { getSubjectById } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface SubjectIconProps {
  subjectId: string | null | undefined;
  className?: string;
  size?: number;
}

/**
 * Renders a subject icon, supporting both emoji and image icons.
 * Use this anywhere you would otherwise render `{subject.icon}` directly.
 */
export function SubjectIcon({ subjectId, className, size = 40 }: SubjectIconProps) {
  const sub = subjectId ? getSubjectById(subjectId) : null;
  if (!sub) return null;

  if (sub.iconType === 'image') {
    return (
      <img
        src={sub.icon}
        alt={sub.name}
        style={{ width: size, height: size }}
        className={cn('object-contain inline-block', className)}
      />
    );
  }

  return (
    <span className={cn('inline-block leading-none', className)} style={{ fontSize: size }}>
      {sub.icon}
    </span>
  );
}