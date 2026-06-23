import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Shape {
  id: number;
  x: number;
  y: number;
  size: number;
  type: 'circle' | 'square' | 'triangle' | 'hexagon';
  speed: number;
  delay: number;
  opacity: number;
}

export function FloatingShapes({ className }: { className?: string }) {
  const shapes: Shape[] = [
    { id: 1, x: 10, y: 20, size: 60, type: 'circle', speed: 20, delay: 0, opacity: 0.08 },
    { id: 2, x: 80, y: 10, size: 80, type: 'hexagon', speed: 25, delay: 2, opacity: 0.06 },
    { id: 3, x: 20, y: 70, size: 50, type: 'square', speed: 18, delay: 1, opacity: 0.07 },
    { id: 4, x: 70, y: 60, size: 70, type: 'triangle', speed: 22, delay: 3, opacity: 0.05 },
    { id: 5, x: 50, y: 30, size: 40, type: 'circle', speed: 15, delay: 0.5, opacity: 0.09 },
    { id: 6, x: 90, y: 80, size: 55, type: 'hexagon', speed: 28, delay: 1.5, opacity: 0.06 },
    { id: 7, x: 5, y: 50, size: 45, type: 'triangle', speed: 20, delay: 2.5, opacity: 0.07 },
    { id: 8, x: 40, y: 85, size: 65, type: 'square', speed: 24, delay: 0.8, opacity: 0.05 },
  ];

  const renderShape = (shape: Shape) => {
    const baseStyle = {
      left: `${shape.x}%`,
      top: `${shape.y}%`,
      width: shape.size,
      height: shape.size,
      animationDuration: `${shape.speed}s`,
      animationDelay: `${shape.delay}s`,
      opacity: shape.opacity,
    };

    switch (shape.type) {
      case 'circle':
        return (
          <div
            key={shape.id}
            className="absolute rounded-full bg-primary animate-float-shape"
            style={baseStyle}
          />
        );
      case 'square':
        return (
          <div
            key={shape.id}
            className="absolute rounded-lg bg-accent animate-float-shape rotate-12"
            style={baseStyle}
          />
        );
      case 'triangle':
        return (
          <div
            key={shape.id}
            className="absolute animate-float-shape"
            style={{
              ...baseStyle,
              width: 0,
              height: 0,
              borderLeft: `${shape.size / 2}px solid transparent`,
              borderRight: `${shape.size / 2}px solid transparent`,
              borderBottom: `${shape.size}px solid hsl(var(--primary) / ${shape.opacity})`,
            }}
          />
        );
      case 'hexagon':
        return (
          <div
            key={shape.id}
            className="absolute animate-float-shape"
            style={baseStyle}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <polygon
                points="50 1 95 25 95 75 50 99 5 75 5 25"
                fill="currentColor"
                className="text-accent"
                style={{ opacity: shape.opacity * 10 }}
              />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      {shapes.map(renderShape)}
    </div>
  );
}
