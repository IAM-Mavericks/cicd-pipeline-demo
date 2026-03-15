import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Bell, Menu, X, Shield, CreditCard, Send, History, Settings, LogOut, User, Sparkles, MessageSquare, Wallet } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SimpleThemeToggle, ThemeIcon } from '@/components/theme-toggle';
import { useTheme } from 'next-themes';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function Navbar({ currentPage, onNavigate, user }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'payments', label: 'Payments', icon: Send },
    { id: 'accounts', label: 'Accounts', icon: Wallet },
    { id: 'cards', label: 'Virtual Cards', icon: CreditCard },
    { id: 'transactions', label: 'Transactions', icon: History },
    { id: 'chat', label: 'Chat AI', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Settings },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <h2 className="text-2xl font-bold text-cyan-400">Navigation</h2>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-foreground hover:bg-accent/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 flex flex-col gap-3 p-6 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setIsOpen(false);
              }}
              className={`
                relative flex items-center justify-between w-full px-5 py-4 rounded-2xl
                transition-all duration-300 text-left
                ${isActive
                  ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-pink-500 text-white shadow-lg shadow-cyan-500/50'
                  : 'bg-card/50 border border-border text-card-foreground hover:bg-accent/50 hover:border-primary/30'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-cyan-400'}`} />
                <span className="font-medium">{item.label}</span>
              </div>
              {isActive && <Sparkles className="h-5 w-5 text-white" />}
            </button>
          );
        })}
      </div>

      {/* Footer with user email */}
      {user && (
        <div className="p-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Logged in as <span className="text-cyan-400">{user.email}</span>
          </p>
        </div>
      )}
    </div>
  );

  if (!user) {
    return (
      <nav className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                  SznPay
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <SimpleThemeToggle />
              <Button
                variant="ghost"
                className="text-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => onNavigate('auth')}
              >
                Login
              </Button>
              <Button
                className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                onClick={() => onNavigate('auth')}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                SznPay
              </h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={currentPage === item.id ? "default" : "ghost"}
                    className="text-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={() => onNavigate(item.id)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="neon"
              size="icon-lg"
              className="rounded-2xl relative"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              <ThemeIcon />
            </Button>

            <Button
              variant="neon"
              size="icon-lg"
              className="rounded-2xl"
            >
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="neon-gradient"
                  className="relative h-14 w-14 rounded-full p-0 overflow-hidden"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 text-white font-bold text-lg">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-popover/90 backdrop-blur-md border-border" align="end">
                <DropdownMenuItem onClick={() => onNavigate('profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate('auth')}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button
                  variant="neon"
                  size="icon-lg"
                  className="rounded-2xl"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-slate-900 border-slate-800 p-0 w-[400px] max-w-[85vw]">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription>Navigate between your SznPay pages</SheetDescription>
                </SheetHeader>
                <NavContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}