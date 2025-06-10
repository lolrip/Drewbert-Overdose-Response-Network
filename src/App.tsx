import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { MonitoringView } from './components/MonitoringView';
import { ResponderDashboard } from './components/ResponderDashboard';
import { ResponderProfile } from './components/ResponderProfile';
import { AdminDashboard } from './components/AdminDashboard';
import { EmergencyHelp } from './components/EmergencyHelp';
import { FloatingAssistant } from './components/FloatingAssistant';
import { AuthWrapper } from './components/AuthWrapper';

type View = 'landing' | 'monitoring' | 'dashboard' | 'emergency' | 'responder-profile' | 'admin-dashboard';

function App() {
  const [currentView, setCurrentView] = useState<View>('landing');

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
    // In a real app, this would send the alert to the backend
    console.log('Alert triggered for location:', location);
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
    <div className="relative">
      {wrappedComponent}
      
      {/* Floating AI Assistant - available on all pages */}
      <FloatingAssistant />
    </div>
  );
}

export default App;