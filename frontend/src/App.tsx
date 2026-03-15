import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
// import { useInactivityTimeout } from '@/hooks/use-inactivity-timeout';
// import { TimeoutWarningDialog } from '@/components/timeout-warning-dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// Import all pages
import Index from './pages/Index';
import PortfolioAnalysis from './pages/PortfolioAnalysis';
import PortfolioInsights from './pages/portfolio/PortfolioInsights';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Payments from './pages/Payments';
import BillPayments from './pages/BillPayments';
import VirtualCards from './pages/VirtualCards';
import Transactions from './pages/Transactions';
import ChatAI from './pages/ChatAI';
import Security from './pages/Security';
import Profile from './pages/Profile';
import Loading3D from './components/loading/Loading3D';
import Accounts from './pages/Accounts';
import Privacy from './pages/Privacy';

import { useRegisterSW } from 'virtual:pwa-register/react';
import OfflineIndicator from './components/OfflineIndicator';

interface UserData {
  name: string;
  email: string;
  avatar?: string;
}

const App = () => {
  // PWA registration
  useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState<UserData | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show loading screen for 2 seconds on initial load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleNavigation = (page: string) => {
    setCurrentPage(page);
  };

  const handleLogin = (userData: UserData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('home');
    setShowTimeoutWarning(false);
    toast.info('You have been logged out successfully');
  };

  const handleTimeoutLogout = () => {
    console.log('🔴 Timeout logout triggered');
    setUser(null);
    setCurrentPage('home');
    setShowTimeoutWarning(false);
    toast.error('You have been logged out due to inactivity for security reasons');
  };

  const handleTimeoutWarning = () => {
    console.log('⚠️ Timeout warning triggered');
    setShowTimeoutWarning(true);
  };

  const handleStayLoggedIn = () => {
    console.log('✅ Stay logged in clicked');
    setShowTimeoutWarning(false);
    toast.success('Session extended successfully');
  };

  // Inactivity timeout hook - commented out for debugging
  // const { timeLeft, isWarningActive } = useInactivityTimeout({
  //   timeout: 15000, // 15 seconds for testing
  //   onTimeout: handleTimeoutLogout,
  //   onWarning: handleTimeoutWarning,
  //   warningTime: 5000, // 5 seconds warning
  //   enabled: !!user, // Only enabled when user is logged in
  // });

  // Temporary values for debugging
  const timeLeft = 0;
  const isWarningActive = false;

  // Debug logging
  console.log('🔍 Debug info:', {
    user: !!user,
    timeLeft,
    isWarningActive,
    showTimeoutWarning
  });

  const shouldReduceMotion = useReducedMotion();

  const pageVariants = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: shouldReduceMotion ? 0 : -20 },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: shouldReduceMotion ? 0 : 0.4,
  };

  const renderCurrentPage = () => {
    const pageContent = (() => {
      switch (currentPage) {
        case 'home':
          return <Index onNavigate={handleNavigation} />;
        case 'auth':
          return <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
        case 'dashboard':
          return user ? <Dashboard onNavigate={handleNavigation} user={user} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
        case 'payments':
          return user ? <Payments onNavigate={handleNavigation} user={user} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
        case 'bill-payments':
          return user ? <BillPayments onNavigate={handleNavigation} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
        case 'cards':
          return user ? <VirtualCards onNavigate={handleNavigation} user={user} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
        case 'transactions':
          return user ? <Transactions onNavigate={handleNavigation} user={user} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
        case 'accounts':
          return user ? <Accounts onNavigate={handleNavigation} user={user} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
        case 'chat':
          return user ? <ChatAI onNavigate={handleNavigation} user={user} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
        case 'security':
          return user ? <Security onNavigate={handleNavigation} user={user} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
        case 'profile':
          return user ? <Profile /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
        case 'portfolio-analysis':
          return user ? <PortfolioAnalysis /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
        case 'portfolio-insights':
          return user ? <PortfolioInsights /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
        case 'privacy':
          return user ? <Privacy onNavigate={handleNavigation} /> : <Auth onNavigate={handleNavigation} onLogin={handleLogin} />;
        default:
          return <Index onNavigate={handleNavigation} />;
      }
    })();

    return (
      <motion.div
        key={currentPage}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full"
      >
        {pageContent}
      </motion.div>
    );
  };

  if (isLoading) {
    return <Loading3D />;
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <AnimatePresence mode="wait">
          <div className="min-h-screen bg-background text-foreground">
            <OfflineIndicator />
            {renderCurrentPage()}

            {/* Debug: Manual test button for timeout (only show when logged in) */}
            {user && (
              <div className="fixed bottom-4 right-4 z-50">
                <Button
                  onClick={() => {
                    console.log('📝 Manual test: Triggering timeout warning');
                    setShowTimeoutWarning(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-red-500/10 border-red-500 text-red-600 hover:bg-red-500/20"
                >
                  Test Timeout Dialog
                </Button>
              </div>
            )}
          </div>

          {/* Timeout Warning Dialog - commented out for debugging */}
          {/* <TimeoutWarningDialog
            isOpen={showTimeoutWarning && isWarningActive}
            timeLeft={timeLeft}
            onStayLoggedIn={handleStayLoggedIn}
            onLogout={handleTimeoutLogout}
          /> */}
        </AnimatePresence>
      </TooltipProvider>
    </ThemeProvider>
  );
};

export default App;