import React from 'react';
import { Heart, Shield, Users, AlertTriangle } from 'lucide-react';
import { BoltBadge } from './BoltBadge';

interface LandingPageProps {
  onStartMonitoring: () => void;
  onEmergencyHelp: () => void;
  onViewDashboard: () => void;
}

export function LandingPage({ onStartMonitoring, onEmergencyHelp, onViewDashboard }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold font-space text-primary-900">
              Drewbert
            </h1>
          </div>
          <p className="text-primary-700 font-manrope text-lg">
            Community-driven overdose detection and response
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-20">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Welcome Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-primary-100 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold font-space text-gray-900 mb-4">
                Welcome to Drewbert
              </h2>
              <p className="text-gray-700 font-manrope leading-relaxed max-w-2xl mx-auto">
                Drewbert is a community-driven platform designed to help prevent overdose emergencies through 
                real-time monitoring and rapid response coordination. <span style="font-weight:600;">Your privacy and anonymity are our top priorities.</span>
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-primary-50 rounded-xl">
                <Shield className="w-8 h-8 text-primary-600 mx-auto mb-3" />
                <h3 className="font-semibold font-space text-primary-900 mb-2">Anonymous & Private</h3>
                <p className="text-sm text-primary-700 font-manrope">
                  Your identity remains protected with our two-tier location system
                </p>
              </div>
              <div className="text-center p-6 bg-accent-50 rounded-xl">
                <Users className="w-8 h-8 text-accent-600 mx-auto mb-3" />
                <h3 className="font-semibold font-space text-gray-900 mb-2">Community Response</h3>
                <p className="text-sm text-gray-700 font-manrope">
                  Trained community responders ready to help in emergencies
                </p>
              </div>
              <div className="text-center p-6 bg-coral-50 rounded-xl">
                <AlertTriangle className="w-8 h-8 text-coral-600 mx-auto mb-3" />
                <h3 className="font-semibold font-space text-gray-900 mb-2">Real-time Monitoring</h3>
                <p className="text-sm text-gray-700 font-manrope">
                  60-second check-ins with automatic emergency dispatch
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={onStartMonitoring}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold font-space py-4 px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-3">
                <Shield className="w-6 h-6" />
                <span className="text-lg">Start Monitoring</span>
              </div>
              <p className="text-primary-100 text-sm font-manrope mt-1">
                Begin 60-second safety check-ins
              </p>
            </button>

            <button
              onClick={onEmergencyHelp}
              className="w-full bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white font-semibold font-space py-4 px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] animate-pulse-slow"
            >
              <div className="flex items-center justify-center gap-3">
                <AlertTriangle className="w-6 h-6" />
                <span className="text-lg">Help Now</span>
              </div>
              <p className="text-coral-100 text-sm font-manrope mt-1">
                Emergency assistance needed immediately
              </p>
            </button>

            <button
              onClick={onViewDashboard}
              className="w-full bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white font-semibold font-space py-3 px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-center gap-3">
                <Users className="w-5 h-5" />
                <span>Responder Dashboard</span>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="text-center pt-8 border-t border-primary-100">
            <p className="text-sm text-gray-600 font-manrope mb-4">
              Need help? Click the chat assistant in the bottom right corner.
            </p>
            <p className="text-sm text-gray-600 font-manrope">
              If you're experiencing a medical emergency, call 911 immediately.
            </p>
            <p className="text-xs text-gray-500 font-manrope mt-2">
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