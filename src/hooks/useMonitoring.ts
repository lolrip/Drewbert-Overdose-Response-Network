import { useState, useCallback, useRef, useEffect } from 'react';

export interface MonitoringState {
  isActive: boolean;
  phase: 'idle' | 'monitoring' | 'prompting' | 'final_warning' | 'alert_sent';
  timeRemaining: number;
  totalCheckins: number;
  promptMessage: string;
  showPrompt: boolean;
}

export function useMonitoring() {
  const [state, setState] = useState<MonitoringState>({
    isActive: false,
    phase: 'idle',
    timeRemaining: 60,
    totalCheckins: 0,
    promptMessage: '',
    showPrompt: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onAlertCallback = useRef<(() => void) | null>(null);
  const alertTriggeredRef = useRef<boolean>(false);

  const prompts = [
    "Hey there! Just checking in - how are you feeling right now?",
    "Time for a quick check-in! Are you doing okay?",
    "Drewbert here! How's everything going?",
    "Quick safety check - are you feeling alright?",
    "Just wanted to see how you're doing. Everything okay?",
    "Time for your check-in! How are you feeling?",
    "Hey! Just making sure you're safe and sound.",
    "Quick check - how are things going right now?",
  ];

  const getRandomPrompt = useCallback(() => {
    return prompts[Math.floor(Math.random() * prompts.length)];
  }, []);

  const startMonitoring = useCallback(() => {
    // Reset alert trigger flag when starting new monitoring session
    alertTriggeredRef.current = false;
    
    setState(prev => ({
      ...prev,
      isActive: true,
      phase: 'monitoring',
      timeRemaining: 60,
      showPrompt: false,
      promptMessage: '',
    }));

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setState(prev => {
        // Don't continue counting if alert has been sent
        if (prev.phase === 'alert_sent' && prev.timeRemaining <= 0) {
          return prev; // Keep timer at 0:00
        }
        
        const newTime = prev.timeRemaining - 1;

        // Show prompt when 5 seconds remain in monitoring phase
        if (newTime === 5 && prev.phase === 'monitoring') {
          return {
            ...prev,
            phase: 'prompting',
            promptMessage: getRandomPrompt(),
            showPrompt: true,
            timeRemaining: newTime,
          };
        }

        // Handle timeout scenarios
        if (newTime <= 0) {
          if (prev.phase === 'monitoring' || prev.phase === 'prompting') {
            // Skip warning phase, go directly to 10-second final warning
            return {
              ...prev,
              phase: 'final_warning',
              timeRemaining: 10, // 10-second final warning (changed from 15-second warning + 5-second final)
              showPrompt: false,
              promptMessage: '',
            };
          } else if (prev.phase === 'final_warning') {
            // Send alert (but only once)
            if (onAlertCallback.current && !alertTriggeredRef.current) {
              alertTriggeredRef.current = true;
              console.log('🚨 [useMonitoring] Triggering alert callback (once)');
              onAlertCallback.current();
            }
            return {
              ...prev,
              phase: 'alert_sent',
              timeRemaining: 0, // Stop at 0:00
              showPrompt: false,
              promptMessage: '',
            };
          }
        }

        return {
          ...prev,
          timeRemaining: newTime,
        };
      });
    }, 1000);
  }, [getRandomPrompt]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      phase: 'idle',
      timeRemaining: 60,
      showPrompt: false,
      promptMessage: '',
    }));
  }, []);

  const respondToCheckIn = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: 'monitoring', 
      timeRemaining: 60,
      totalCheckins: prev.totalCheckins + 1,
      showPrompt: false,
      promptMessage: '',
    }));
  }, []);

  const setOnAlert = useCallback((callback: () => void) => {
    onAlertCallback.current = callback;
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    state,
    startMonitoring,
    stopMonitoring,
    respondToCheckIn,
    setOnAlert,
  };
}