import { useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import { toast } from 'sonner';

// Import all pages
import Index from './pages/Index';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Payments from './pages/Payments';
import VirtualCards from './pages/VirtualCards';
import Transactions from './pages/Transactions';
import Security from './pages/Security';

interface UserData {
  name: string;
  email: string;
  avatar?: string;
}

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState<UserData | null>(null);

  const handleNavigation = (page: string) => {
    setCurrentPage(page);
  };

  const handleLogin = (userData: UserData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('home');
    toast.info('You have been logged out successfully');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <Index onNavigate={handleNavigation} />;
      case 'auth':
        return <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
      case 'dashboard':
        return user ? <Dashboard onNavigate={handleNavigation} user={user} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
      case 'payments':
        return user ? <Payments onNavigate={handleNavigation} user={user} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
      case 'cards':
        return user ? <VirtualCards onNavigate={handleNavigation} user={user} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
      case 'transactions':
        return user ? <Transactions onNavigate={handleNavigation} user={user} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
      case 'security':
        return user ? <Security onNavigate={handleNavigation} user={user} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
      default:
        return <Index onNavigate={handleNavigation} />;
    }
  };

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <div className="min-h-screen bg-background text-foreground">
          {renderCurrentPage()}
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;