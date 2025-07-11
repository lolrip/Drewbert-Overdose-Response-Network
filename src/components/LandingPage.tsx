import React, { useEffect, useState } from 'react';
import { Heart, Shield, Users, AlertTriangle } from 'lucide-react';
import { BoltBadge } from './BoltBadge';

interface LandingPageProps {
  onStartMonitoring: () => void;
  onEmergencyHelp: () => void;
  onViewDashboard: () => void;
}

export function LandingPage({ onStartMonitoring, onEmergencyHelp, onViewDashboard }: LandingPageProps) {
  const [showDemoNotice, setShowDemoNotice] = useState(true);

  // Check if user has seen the demo notice before
  useEffect(() => {
    const hasSeenDemo = localStorage.getItem('drewbert-demo-notice-seen');
    if (hasSeenDemo) {
      setShowDemoNotice(false);
    }
  }, []);

  const handleCloseDemoNotice = () => {
    localStorage.setItem('drewbert-demo-notice-seen', 'true');
    setShowDemoNotice(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 overflow-x-hidden">
      {/* Demo Notice Modal */}
      {showDemoNotice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 sm:p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-coral-500 to-coral-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold font-space text-gray-900 mb-2">
                🚀 Demo Version
              </h2>
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold py-1 px-3 rounded-full mb-4">
                <a href="https://hackathon.dev/" target="_new">Bolt.new World's Largest Hackathon</a>
              </div>
            </div>
            
            <div className="space-y-4 text-sm text-gray-600 font-manrope">
              <p>
                <strong className="text-gray-900">This is a demonstration</strong> of the Drewbert community response system built for the Bolt.new hackathon.
              </p>
              <p>
                <strong className="text-coral-600">Important:</strong> There is no actual volunteer response network active yet. This demo showcases the platform's capabilities and user experience.
              </p>
              <p>
                Feel free to explore all features including monitoring, emergency alerts, and the responder dashboard using the test accounts provided.
              </p>
            </div>

            <button
              onClick={handleCloseDemoNotice}
              className="w-full mt-6 bg-primary-600 hover:bg-primary-700 text-white font-semibold font-space py-3 px-6 rounded-xl transition-colors"
            >
              Got it, let's explore!
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-space text-primary-900">
              Drewbert
            </h1>
          </div>
          <p className="text-primary-700 font-manrope text-base sm:text-lg">
            Overdose Detection & Response Network
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Welcome Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-primary-100 p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold font-space text-gray-900 mb-3 sm:mb-4">
                Meet Drewbert!
              </h2>
              {/* Drewbert Alien Image */}
              <img
                src="/drew_alien_transparent.png" 
                style={{ width: '8rem' }}
                alt="Drewbert the Alien mascot"
                className="mx-auto mb-3 sm:mb-4 w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-primary-200 shadow-lg object-cover"
                loading="lazy"
              />
              <p className="text-sm sm:text-base text-gray-700 font-manrope leading-relaxed max-w-2xl mx-auto px-2">
                Drewbert is a community-driven platform designed to help prevent overdose emergencies through 
                real-time monitoring and rapid response coordination. Your privacy and anonymity are our top priorities.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
              <div className="text-center p-3 sm:p-4 lg:p-6 bg-primary-50 rounded-xl">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary-600 mx-auto mb-2 sm:mb-3" />
                <h3 className="font-semibold font-space text-primary-900 mb-1 sm:mb-2 text-sm sm:text-base">Anonymous & Private</h3>
                <p className="text-xs sm:text-sm text-primary-700 font-manrope leading-snug">
                  Your identity remains protected with our two-tier location system
                </p>
              </div>
              <div className="text-center p-3 sm:p-4 lg:p-6 bg-accent-50 rounded-xl">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-accent-600 mx-auto mb-2 sm:mb-3" />
                <h3 className="font-semibold font-space text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Community Response</h3>
                <p className="text-xs sm:text-sm text-gray-700 font-manrope leading-snug">
                  Trained community responders ready to help in emergencies
                </p>
              </div>
              <div className="text-center p-3 sm:p-4 lg:p-6 bg-coral-50 rounded-xl sm:col-span-2 lg:col-span-1">
                <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-coral-600 mx-auto mb-2 sm:mb-3" />
                <h3 className="font-semibold font-space text-gray-900 mb-1 sm:mb-2 text-sm sm:text-base">Real-time Monitoring</h3>
                <p className="text-xs sm:text-sm text-gray-700 font-manrope leading-snug">
                  60-second check-ins with automatic emergency dispatch
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 sm:space-y-4">
            {/* EMERGENCY - Most prominent */}
            <button
              onClick={onEmergencyHelp}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold font-space py-4 sm:py-5 px-4 sm:px-8 rounded-xl shadow-xl border-2 border-red-400 transform transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] animate-pulse-slow"
            >
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
                <span className="text-lg sm:text-xl">EMERGENCY - Help Now</span>
              </div>
              <p className="text-red-100 text-xs sm:text-sm font-manrope mt-1 font-medium">
                Immediate assistance needed
              </p>
            </button>

            {/* PRIMARY - Standard prominence */}
            <button
              onClick={onStartMonitoring}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold font-space py-3 sm:py-4 px-4 sm:px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-base sm:text-lg">Start Monitoring</span>
              </div>
              <p className="text-primary-100 text-xs sm:text-sm font-manrope mt-1">
                Begin 60-second safety check-ins
              </p>
            </button>

            {/* SECONDARY - Less prominent */}
            <button
              onClick={onViewDashboard}
              className="w-full bg-white hover:bg-gray-50 border-2 border-accent-500 hover:border-accent-600 text-accent-600 hover:text-accent-700 font-semibold font-space py-2 sm:py-3 px-4 sm:px-8 rounded-xl shadow-sm transform transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">Responder Dashboard</span>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="text-center pt-6 sm:pt-8 border-t border-primary-100">
            <p className="text-xs sm:text-sm text-gray-600 font-manrope mb-3 sm:mb-4 px-4">
              Need help? Click the chat assistant in the bottom right corner.
            </p>
            <p className="text-xs sm:text-sm text-gray-600 font-manrope mb-2 px-4">
              If you're experiencing a medical emergency, call 911 immediately.
            </p>
            <p className="text-xs text-gray-500 font-manrope px-4">
              Drewbert is a community support tool and should not replace professional medical care.
            </p>
          </div>
        </div>
      </main>

      {/* Built with Bolt Badge */}
      <BoltBadge position="top-right" />
    </div>
  );
}