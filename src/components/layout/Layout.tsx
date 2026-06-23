import { ReactNode } from 'react';
import { Header } from './Header';
import { FloatingShapes } from '@/components/ui/FloatingShapes';
import { AlKhorazmiyChat } from '@/components/AlKhorazmiyChat';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      <FloatingShapes className="fixed z-0" />
      <Header />
      <main className="relative z-10 flex-1 pb-28 md:pb-0">{children}</main>
      <AlKhorazmiyChat />
      <BottomNav />
    </div>
  );
}
