import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationProps {
  message: string;
  type: NotificationType;
  duration?: number; // in milliseconds
  onClose?: () => void;
}

export function Notification({ message, type, duration = 1500, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  // Styles based on notification type
  const baseClasses = "fixed bottom-4 right-4 z-50 p-3 rounded-lg shadow-lg flex items-center gap-2 max-w-xs animate-fade-in";
  
  const typeClasses = {
    success: "bg-primary-50 border border-primary-200 text-primary-900",
    error: "bg-coral-50 border border-coral-200 text-coral-900",
    info: "bg-accent-50 border border-accent-200 text-accent-900"
  };
  
  const iconMap = {
    success: <Check className="w-5 h-5 text-primary-600" />,
    error: <AlertCircle className="w-5 h-5 text-coral-600" />,
    info: <Info className="w-5 h-5 text-accent-600" />
  };
  
  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        setTimeout(onClose, 300); // Allow time for exit animation
      }
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      setTimeout(onClose, 300); // Allow time for exit animation
    }
  };
  
  // Animation classes
  const animationClass = isVisible ? "animate-fade-in" : "animate-fade-out";
  
  return createPortal(
    <div className={`${baseClasses} ${typeClasses[type]} ${animationClass}`}>
      {iconMap[type]}
      <span className="text-sm font-manrope flex-1">{message}</span>
      <button onClick={handleClose} className="p-1 hover:bg-black hover:bg-opacity-10 rounded-full">
        <X className="w-4 h-4" />
      </button>
    </div>,
    document.body
  );
}

interface NotificationData {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notifications: NotificationData[];
  showNotification: (message: string, type?: NotificationType, duration?: number) => string;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const showNotification = (message: string, type: NotificationType = 'info', duration = 2000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after duration
    setTimeout(() => {
      removeNotification(id);
    }, duration + 300);
    
    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
      {children}
      {/* Render notifications */}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {notifications.map(({ id, message, type }) => (
            <Notification 
              key={id}
              message={message}
              type={type}
              onClose={() => removeNotification(id)}
            />
          ))}
        </div>,
        document.body
      )}
    </NotificationContext.Provider>
  );
}

// Hook to use notifications
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
