import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Shield } from 'lucide-react';

interface TimeoutWarningDialogProps {
  isOpen: boolean;
  timeLeft: number; // time left in seconds
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export function TimeoutWarningDialog({
  isOpen,
  timeLeft,
  onStayLoggedIn,
  onLogout,
}: TimeoutWarningDialogProps) {
  const [displayTime, setDisplayTime] = useState(timeLeft);
  
  

  useEffect(() => {
    setDisplayTime(timeLeft);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs} seconds`;
  };

  const progressValue = (displayTime / 10) * 100; // 10 seconds warning window

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md bg-gradient-to-br from-slate-900 to-purple-900 border-amber-500/20 text-white">
        <AlertDialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center">
            <div className="relative">
              <Clock className="h-8 w-8 text-amber-400" />
              <Shield className="h-4 w-4 text-amber-400 absolute -top-1 -right-1" />
            </div>
          </div>
          
          <AlertDialogTitle className="text-xl font-semibold text-amber-100">
            Session Timeout Warning
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-gray-300 text-center">
            For your security, you will be automatically logged out due to inactivity.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-amber-400 mb-2">
              {formatTime(displayTime)}
            </div>
            <div className="text-sm text-gray-400">
              Time remaining before automatic logout
            </div>
          </div>

          <div className="space-y-2">
            <Progress 
              value={progressValue} 
              className="h-2 bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Logout</span>
              <span>Stay logged in</span>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              onClick={onLogout}
              className="flex-1 border-red-500/20 text-red-300 hover:bg-red-500/10"
            >
              Logout Now
            </Button>
          </AlertDialogCancel>
          
          <AlertDialogAction asChild>
            <Button
              onClick={onStayLoggedIn}
              className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
            >
              Stay Logged In
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}