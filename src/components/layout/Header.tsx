import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, LayoutDashboard, ChevronDown, Menu, Home, Info, BarChart2, HelpCircle, Book, Phone } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useState } from 'react';
import logoImg from '@/assets/logo.png';
import { cn } from '@/lib/utils';
export function Header() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const navLinks = [
    { href: '/tests', label: 'Testlar' },
    { href: '/books', label: 'Kitoblar' },
    { href: '/leaderboard', label: 'Reyting' },
    ...(user ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
    { href: '/about', label: 'Biz haqimizda' },
    { href: '/contact', label: 'Aloqa' },
  ];

  const mobileNavLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/about', label: 'About', icon: Info },
    ...(user ? [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
    { href: '/leaderboard', label: 'Reyting', icon: BarChart2 },
    { href: '/tests', label: 'Tests', icon: HelpCircle },
    { href: '/books', label: 'Books', icon: Book },
    { href: '/contact', label: 'Contact', icon: Phone },
    ...(user ? [{ href: '/profile', label: 'Profile', icon: User }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#04061E] text-white border-b border-white/10 transition-all duration-300">
      <div className="container flex h-20 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <img src={logoImg} alt="Math Go Logo" className="h-11 w-11 rounded-md shadow-md transition-transform duration-300 group-hover:scale-105" />
          <div className="flex flex-col">
            <span className="font-serif text-xl font-semibold tracking-tight text-white">Math Go</span>
            <span className="text-[10px] tracking-elegant text-white/70 font-medium uppercase">Math is easy</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} to={link.href}>
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* ThemeToggle on Desktop only */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          
          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85%] sm:w-80 p-0 flex flex-col bg-[#04061E] border-l-0 shadow-2xl">
              {/* Sidebar Header */}
              <div className="bg-[#04061E] p-6 flex flex-col items-start gap-4 border-b border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -z-10" />
                <div className="h-16 w-16 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.5)] bg-black flex items-center justify-center overflow-hidden border-2 border-white/20">
                   <img src={logoImg} alt="Math Go Logo" className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-serif text-xl font-bold text-white">Math Go</span>
                  <span className="text-sm font-medium text-white/70">Math is easy with Math Go</span>
                </div>
              </div>
              
              {/* Sidebar Links */}
              <nav className="flex-1 flex flex-col gap-1.5 p-4 overflow-y-auto">
                {mobileNavLinks.map((link) => {
                  const isActive = location.pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-[15px] group relative overflow-hidden",
                        isActive 
                          ? "text-white bg-white/10" 
                          : "text-white/80 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                      )}
                      <div className={cn(
                        "flex items-center justify-center p-2 rounded-lg transition-colors",
                        isActive ? "bg-white/20 shadow-sm" : "bg-transparent group-hover:bg-white/10"
                      )}>
                        <link.icon className={cn("h-4.5 w-4.5", isActive ? "text-white" : "text-white/70")} />
                      </div>
                      <span className="translate-y-[1px]">{link.label}</span>
                    </Link>
                  );
                })}

                <div className="my-3 border-t border-white/10 mx-2"></div>

                {/* Theme Toggle inside Sidebar */}
                <div className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl mx-2 shadow-sm border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <span className="text-xl leading-none block -translate-y-0.5">🌓</span>
                    </div>
                    <span className="text-white font-semibold text-[14px]">Mavzu</span>
                  </div>
                  <ThemeToggle />
                </div>

                {!user && (
                  <div className="mt-6 flex flex-col gap-3 px-2">
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      <Button variant="outline" className="w-full justify-start gap-3 border-white/20 text-white bg-white/5 shadow-sm hover:bg-white/10 h-12 rounded-xl font-semibold"><User className="h-5 w-5" />Kirish</Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)}>
                      <Button variant="premium" className="w-full h-12 rounded-xl font-bold shadow-[0_4px_15px_rgba(0,0,0,0.3)]">Ro'yxatdan o'tish</Button>
                    </Link>
                  </div>
                )}
                
                {user && (
                  <div className="mt-6 flex flex-col gap-3 px-2 mb-4">
                    {/* User Profile Card */}
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                      <Avatar className="h-10 w-10 border border-white/20">
                        <AvatarImage src={profile?.avatar_url || ''} />
                        <AvatarFallback className="bg-white/10 text-white text-xs">
                          {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold text-white truncate">{profile?.full_name || 'User'}</span>
                        <span className="text-xs font-medium text-white/60 truncate">{user.email}</span>
                      </div>
                    </div>

                    <Button onClick={() => { handleSignOut(); setMobileOpen(false); }} variant="outline" className="w-full justify-start gap-3 text-red-400 border-red-400/30 hover:bg-red-400/10 hover:border-red-400 bg-transparent h-12 rounded-xl shadow-sm transition-all duration-300">
                      <LogOut className="h-5 w-5" />
                      <span className="font-semibold">Chiqish</span>
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {/* User Menu / Login on Desktop only */}
          <div className="hidden md:block">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-auto p-2 hover:bg-muted/50">
                    <Avatar className="h-9 w-9 border-2 border-border transition-transform duration-300 hover:scale-105">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                        {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium">{profile?.full_name?.split(' ')[0]}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 animate-fade-in" align="end">
                  <div className="flex items-center gap-3 p-3 border-b border-border/60">
                    <Avatar className="h-10 w-10 border-2 border-border">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">{profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="p-1">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4" />
                        Profil
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                          <LayoutDashboard className="h-4 w-4" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-1">
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Chiqish
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Kirish
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="premium" size="sm">
                    Ro'yxatdan o'tish
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
