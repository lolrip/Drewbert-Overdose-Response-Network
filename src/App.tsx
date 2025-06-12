import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { MonitoringView } from './components/MonitoringView';
import { ResponderDashboard } from './components/ResponderDashboard';
import { ResponderProfile } from './components/ResponderProfile';
import { AdminDashboard } from './components/AdminDashboard';
import { EmergencyHelp } from './components/EmergencyHelp';
import { FloatingAssistant } from './components/FloatingAssistant';
import { AuthWrapper } from './components/AuthWrapper';
import { NotificationProvider } from './components/Notification';
import { updateUserLastSeen } from './lib/supabase';

type View = 'landing' | 'monitoring' | 'dashboard' | 'emergency' | 'responder-profile' | 'admin-dashboard';

function App() {
  const [currentView, setCurrentView] = useState<View>('landing');
  
  // Update the user's last_seen_at timestamp periodically
  useEffect(() => {
    // Update on initial load
    updateUserLastSeen();
    
    // Then update every minute
    const interval = setInterval(() => {
      updateUserLastSeen();
    }, 60 * 1000); // Every minute
    
    return () => clearInterval(interval);
  }, []);

  const handleStartMonitoring = () => {
    setCurrentView('monitoring');
  };

  const handleEmergencyHelp = () => {
    setCurrentView('emergency');
  };

  const handleViewDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleViewProfile = () => {
    setCurrentView('responder-profile');
  };

  const handleViewAdminDashboard = () => {
    setCurrentView('admin-dashboard');
  };

  const handleBack = () => {
    setCurrentView('landing');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleAlert = (location: { general: string; precise: string }) => {
    // Alert was already created by MonitoringView, just navigate to emergency screen
    console.log('🎯 [App] handleAlert called with location:', location);
    console.log('🎯 [App] Current sessionStorage active_alert:', sessionStorage.getItem('active_alert'));
    
    // Set a flag to indicate this is coming from MonitoringView
    sessionStorage.setItem('from_monitoring', 'true');
    console.log('🎯 [App] Set from_monitoring flag and navigating to emergency');
    
    setCurrentView('emergency');
  };

  // Views that require authentication
  const requiresAuth = ['dashboard', 'responder-profile', 'admin-dashboard'].includes(currentView);

  let currentComponent;
  switch (currentView) {
    case 'monitoring':
      currentComponent = (
        <MonitoringView 
          onBack={handleBack} 
          onAlert={handleAlert}
        />
      );
      break;
    case 'dashboard':
      currentComponent = (
        <ResponderDashboard 
          onBack={handleBack}
          onViewProfile={handleViewProfile}
        />
      );
      break;
    case 'responder-profile':
      currentComponent = (
        <ResponderProfile 
          onBack={handleBackToDashboard}
          onViewAdminDashboard={handleViewAdminDashboard}
        />
      );
      break;
    case 'admin-dashboard':
      currentComponent = (
        <AdminDashboard 
          onBack={handleViewProfile}
        />
      );
      break;
    case 'emergency':
      currentComponent = (
        <EmergencyHelp onBack={handleBack} />
      );
      break;
    default:
      currentComponent = (
        <LandingPage
          onStartMonitoring={handleStartMonitoring}
          onEmergencyHelp={handleEmergencyHelp}
          onViewDashboard={handleViewDashboard}
        />
      );
  }

  // Wrap authenticated views with AuthWrapper
  const wrappedComponent = requiresAuth ? (
    <AuthWrapper requireAuth={true}>
      {currentComponent}
    </AuthWrapper>
  ) : currentComponent;

  return (
    <NotificationProvider>
      <div className="relative">
        {wrappedComponent}
        
        {/* Floating AI Assistant - available on all pages */}
        <FloatingAssistant />
      </div>
    </NotificationProvider>
  );
}

export default App;