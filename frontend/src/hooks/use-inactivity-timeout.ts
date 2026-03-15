import { useEffect, useRef, useCallback, useState } from 'react';

interface UseInactivityTimeoutOptions {
  timeout: number; // timeout in milliseconds
  onTimeout: () => void; // callback when timeout occurs
  onWarning?: (timeLeft: number) => void; // callback when warning should be shown
  warningTime?: number; // time in milliseconds before timeout to show warning
  enabled?: boolean; // whether timeout is enabled
  events?: string[]; // events to listen for user activity
}

interface UseInactivityTimeoutReturn {
  isActive: boolean;
  timeLeft: number;
  resetTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  isWarningActive: boolean;
}

const DEFAULT_EVENTS = [
  'mousedown',
  'mousemove',
  'keypress',
  'keydown',
  'click',
  'scroll',
  'touchstart',
  'touchmove',
];

export const useInactivityTimeout = (
  options: UseInactivityTimeoutOptions
): UseInactivityTimeoutReturn => {
  const {
    timeout,
    onTimeout,
    onWarning,
    warningTime = 10000, // 10 seconds before timeout
    enabled = true,
    events = DEFAULT_EVENTS,
  } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isActive, setIsActive] = useState(enabled);
  const [timeLeft, setTimeLeft] = useState(timeout);
  const [isWarningActive, setIsWarningActive] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Update time left every second when warning is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isWarningActive) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTimeRef.current;
        const remaining = Math.max(0, timeout - elapsed);
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWarningActive, timeout]);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    setIsWarningActive(false);
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();
    
    if (!enabled) {
      return;
    }

    startTimeRef.current = Date.now();
    setTimeLeft(timeout);

    // Set warning timer
    if (onWarning && warningTime < timeout) {
      warningTimeoutRef.current = setTimeout(() => {
        setIsWarningActive(true);
        onWarning(warningTime);
      }, timeout - warningTime);
    }

    // Set main timeout timer
    timeoutRef.current = setTimeout(() => {
      setIsActive(false);
      setIsWarningActive(false);
      onTimeout();
    }, timeout);
  }, [timeout, onTimeout, onWarning, warningTime, enabled, clearTimers]);

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    
    setIsWarningActive(false);
    startTimers();
  }, [enabled, startTimers]);

  const pauseTimer = useCallback(() => {
    clearTimers();
    setIsActive(false);
  }, [clearTimers]);

  const resumeTimer = useCallback(() => {
    if (!enabled) return;
    
    setIsActive(true);
    startTimers();
  }, [enabled, startTimers]);

  const handleActivity = useCallback(() => {
    if (enabled && isActive) {
      resetTimer();
    }
  }, [enabled, isActive, resetTimer]);

  // Set up event listeners
  useEffect(() => {
    if (!enabled) return;

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start timers on mount
    startTimers();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearTimers();
    };
  }, [enabled, events, handleActivity, startTimers, clearTimers]);

  // Update enabled state
  useEffect(() => {
    setIsActive(enabled);
    if (enabled) {
      startTimers();
    } else {
      clearTimers();
    }
  }, [enabled, startTimers, clearTimers]);

  return {
    isActive,
    timeLeft: Math.ceil(timeLeft / 1000), // return in seconds
    resetTimer,
    pauseTimer,
    resumeTimer,
    isWarningActive,
  };
};