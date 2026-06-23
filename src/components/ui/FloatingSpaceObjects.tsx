import { useMemo } from 'react';

interface SpaceObject {
  id: number;
  emoji: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

const SPACE_EMOJIS = ['🪐', '🌍', '🌙', '⭐', '☄️', '🚀', '🛸', '✨', '💫', '🌟'];

export function FloatingSpaceObjects() {
  const objects = useMemo<SpaceObject[]>(() => {
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      emoji: SPACE_EMOJIS[i % SPACE_EMOJIS.length],
      x: Math.random() * 90 + 5,
      y: Math.random() * 90 + 5,
      size: Math.random() * 20 + 16,
      duration: Math.random() * 15 + 20,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.15 + 0.08,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {objects.map((obj) => (
        <span
          key={obj.id}
          className="absolute animate-cosmic-float select-none"
          style={{
            left: `${obj.x}%`,
            top: `${obj.y}%`,
            fontSize: `${obj.size}px`,
            opacity: obj.opacity,
            animationDuration: `${obj.duration}s`,
            animationDelay: `${obj.delay}s`,
          }}
        >
          {obj.emoji}
        </span>
      ))}
    </div>
  );
}
