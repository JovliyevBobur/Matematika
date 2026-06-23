import { NavLink } from 'react-router-dom';
import { Home, Info, Mail, LayoutDashboard, User, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function BottomNav() {
  const { user } = useAuth();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/about', icon: Info, label: 'About' },
    { to: '/contact', icon: Mail, label: 'Contact' },
    ...(user ? [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }] : []),
    ...(user ? [{ to: '/profile', icon: User, label: 'Profile' }] : []),
    { to: '/leaderboard', icon: BarChart2, label: 'Reyting' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#EFECE6]/85 dark:bg-[#0B1021]/85 backdrop-blur-2xl border-t border-white/40 dark:border-white/5 z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.06)] transition-all duration-500">
      <div className="flex items-center justify-around px-2 py-1.5 relative">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl transition-all duration-500 relative group",
                isActive 
                  ? "text-[#1B2559] dark:text-[#E2B714]" 
                  : "text-muted-foreground/80 hover:text-[#1B2559] dark:hover:text-[#E2B714]/80"
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Animated active background pill */}
                <div className={cn(
                  "absolute inset-0 m-auto w-11 h-11 rounded-xl bg-black/5 dark:bg-[#E2B714]/15 transition-all duration-500 ease-out",
                  isActive ? "scale-100 opacity-100" : "scale-50 opacity-0"
                )} />
                
                {/* Icon with bounce effect */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full">
                  <item.icon 
                    strokeWidth={isActive ? 2.5 : 2}
                    className={cn(
                      "w-5 h-5 transition-all duration-500 ease-out",
                      isActive ? "scale-110 -translate-y-1 drop-shadow-sm" : "group-hover:scale-110 group-hover:-translate-y-0.5"
                    )} 
                  />
                  {/* Label with smooth fade and slide */}
                  <span className={cn(
                    "absolute bottom-0 text-[9px] font-bold tracking-wide transition-all duration-500",
                    isActive ? "opacity-100 translate-y-1.5" : "opacity-0 translate-y-3"
                  )}>
                    {item.label}
                  </span>
                  
                  {/* Tiny glowing dot for active state (optional, adds premium feel) */}
                  <div className={cn(
                    "absolute -bottom-1 w-1 h-1 rounded-full bg-[#1B2559] dark:bg-[#E2B714] transition-all duration-500",
                    isActive ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  )} />
                </div>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
