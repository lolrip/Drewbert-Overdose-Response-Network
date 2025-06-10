import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Phone, MapPin, Clock, Users, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useMonitoringSession } from '../hooks/useMonitoringSession';
import { useRealTimeStats } from '../hooks/useRealTimeStats';
import { getCurrentLocation, reverseGeocode, formatGeneralLocation, formatPreciseLocation } from '../lib/location';

interface EmergencyHelpProps {
  onBack: () => void;
}

export function EmergencyHelp({ onBack }: EmergencyHelpProps) {
  const [alertSent, setAlertSent] = useState(false);
  const [alertId, setAlertId] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const { createAlert } = useMonitoringSession();
  const { stats, connectionStatus, refetch } = useRealTimeStats();
  const [locationData, setLocationData] = useState<{ general: string; precise: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  // Get responder count for this specific alert
  const responderCount = alertId ? (stats.alertCommitments[alertId] || 0) : 0;

  // Collect location when component mounts
  useEffect(() => {
    const collectLocation = async () => {
      setLocationPermissionDenied(false);
      try {
        // Check if geolocation is supported
        if (!navigator.geolocation) {
          throw new Error('Geolocation is not supported by this browser');
        }

        // Request permission explicitly
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'denied') {
          setLocationPermissionDenied(true);
          throw new Error('Location permission denied. Please enable location access in your browser settings.');
        }

        const location = await getCurrentLocation();
        const geocodeResult = await reverseGeocode(location);
        const locationInfo = {
          general: formatGeneralLocation(geocodeResult),
          precise: formatPreciseLocation(geocodeResult)
        };
        setLocationData(locationInfo);
        setLocationError(null);
      } catch (error) {
        console.error('Failed to get location:', error);
        if (error instanceof GeolocationPositionError && error.code === error.PERMISSION_DENIED) {
          setLocationPermissionDenied(true);
        }
        setLocationError(error instanceof Error ? error.message : 'Failed to get location');
        // Set fallback location
        setLocationData({
          general: 'Location unavailable',
          precise: 'Location unavailable'
        });
      }
    };

    collectLocation();
  }, []);

  useEffect(() => {
    // Simulate sending alert
    const alertTimer = setTimeout(async () => {
      setAlertSent(true);
      
      // Create alert in database if location is available
      if (locationData) {
        try {
          // Create emergency alert without a session (sessionId = null)
          const alert = await createAlert(null, locationData);
          setAlertId(alert.id);
          console.log('✅ Emergency alert created successfully:', alert);
          
          // Trigger immediate stats refresh to get responder count
          setTimeout(() => {
            refetch();
          }, 500);
        } catch (error) {
          console.error('❌ Failed to create emergency alert:', error);
        }
      }
    }, 2000);

    return () => {
      clearTimeout(alertTimer);
    };
  }, [locationData, createAlert, refetch]);

  useEffect(() => {
    if (alertSent) {
      const interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [alertSent]);

  // Refresh responder count more frequently for emergency alerts
  useEffect(() => {
    if (alertSent && alertId) {
      const interval = setInterval(() => {
        console.log('🔄 Refreshing emergency alert stats');
        refetch();
      }, 5000); // Every 5 seconds for emergency alerts

      return () => clearInterval(interval);
    }
  }, [alertSent, alertId, refetch]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-primary-600" />;
      case 'reconnecting':
        return <RefreshCw className="w-4 h-4 text-accent-600 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-coral-600" />;
    }
  };

  if (!locationData && !locationError) {
    return (
      <div className="min-h-screen bg-coral-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-12 h-12 bg-coral-600 rounded-xl animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600 font-manrope">Getting your location...</p>
          {locationPermissionDenied && (
            <div className="mt-4 bg-coral-50 border border-coral-200 rounded-lg p-4">
              <p className="text-coral-800 text-sm font-manrope mb-2">
                Location access is required for emergency response.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="text-coral-600 hover:text-coral-700 font-semibold text-sm"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-coral-50 via-white to-coral-100">
      {/* Header */}
      <header className="px-6 py-4 bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-space text-coral-900">
                Emergency Help
              </h1>
              <div className="flex items-center gap-2">
                {getConnectionStatusIcon()}
                <span className="text-xs text-gray-500 font-manrope">
                  {connectionStatus === 'connected' ? 'Live' : 
                   connectionStatus === 'reconnecting' ? 'Connecting...' : 'Offline'}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 font-manrope">
              Immediate assistance request
            </p>
          </div>
        </div>
      </header>

      {/* Location Error */}
      {locationError && (
        <div className="mx-6 mt-4 bg-coral-50 border border-coral-200 rounded-lg p-3">
          <p className="text-coral-800 text-sm font-manrope">
            Location Error: {locationError}
          </p>
        </div>
      )}

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-md mx-auto space-y-8">
          
          {!alertSent ? (
            // Sending Alert
            <div className="bg-white rounded-2xl shadow-lg border-2 border-coral-200 p-8 text-center">
              <div className="w-20 h-20 bg-coral-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <AlertTriangle className="w-10 h-10 text-coral-600" />
              </div>
              <h2 className="text-2xl font-bold font-space text-coral-900 mb-4">
                Sending Emergency Alert
              </h2>
              <p className="text-gray-600 font-manrope mb-6">
                Your location is being determined and community responders are being notified...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-coral-500 h-2 rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>
          ) : (
            // Alert Sent
            <div className="bg-white rounded-2xl shadow-lg border-2 border-primary-200 p-8 text-center">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold font-space text-primary-900 mb-4">
                Help is Coming
              </h2>
              <p className="text-gray-600 font-manrope mb-6">
                Community responders have been notified and are responding to your location.
              </p>

              {/* Real-time Status */}
              <div className="bg-primary-50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-primary-600" />
                      <span className="text-lg font-bold font-space text-primary-900">
                        {responderCount}
                      </span>
                    </div>
                    <p className="text-xs text-primary-700 font-manrope">
                      {responderCount === 1 ? 'Responder' : 'Responders'}
                    </p>
                    <p className="text-xs text-primary-600 font-manrope">
                      {connectionStatus === 'connected' ? 'Live count' : 'Last known'}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-primary-600" />
                      <span className="text-lg font-bold font-space text-primary-900">
                        {formatTime(timeElapsed)}
                      </span>
                    </div>
                    <p className="text-xs text-primary-700 font-manrope">Elapsed</p>
                    <p className="text-xs text-primary-600 font-manrope">Since alert sent</p>
                  </div>
                </div>
              </div>

              {/* Response Status */}
              {responderCount > 0 ? (
                <div className="bg-accent-50 border border-accent-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3 text-accent-800">
                    <Users className="w-5 h-5" />
                    <p className="font-manrope font-medium">
                      {responderCount} {responderCount === 1 ? 'responder has' : 'responders have'} committed to help you
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Clock className="w-5 h-5" />
                    <p className="font-manrope">
                      Waiting for responders to accept your alert...
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Emergency Contacts */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="font-bold font-space text-gray-900 mb-4 text-center">
              Emergency Contacts
            </h3>
            
            <div className="space-y-3">
              <button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold font-space py-4 px-6 rounded-xl transition-colors">
                <div className="flex items-center justify-center gap-3">
                  <Phone className="w-5 h-5" />
                  <span>Call 911</span>
                </div>
              </button>

              <button className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold font-space py-3 px-6 rounded-xl transition-colors">
                <div className="flex items-center justify-center gap-3">
                  <Phone className="w-4 h-4" />
                  <span>Poison Control: 1-800-222-1222</span>
                </div>
              </button>

              <button className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold font-space py-3 px-6 rounded-xl transition-colors">
                <div className="flex items-center justify-center gap-3">
                  <Phone className="w-4 h-4" />
                  <span>Crisis Text Line: Text HOME to 741741</span>
                </div>
              </button>
            </div>
          </div>

          {/* Location Info */}
          {locationData && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold font-space text-gray-900">Your Location</h3>
              </div>
              <p className="text-sm text-gray-600 font-manrope mb-3">
                <strong>General Area:</strong> {locationData.general}
              </p>
              <p className="text-sm text-gray-600 font-manrope">
                Your precise location has been shared with committed responders to ensure they can find you quickly.
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-coral-50 rounded-xl p-4 border border-coral-200">
            <h3 className="font-semibold font-space text-coral-900 mb-2">While You Wait</h3>
            <ul className="text-sm text-coral-800 font-manrope space-y-1">
              <li>• Stay in your current location if it's safe</li>
              <li>• Keep your phone nearby and charged</li>
              <li>• Unlock your door if you're inside and able</li>
              <li>• Call 911 if the situation worsens</li>
            </ul>
          </div>

          {/* Cancel Button */}
          <button
            onClick={onBack}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold font-space py-3 px-6 rounded-xl transition-colors"
          >
            I'm Safe - Cancel Alert
          </button>
        </div>
      </main>
    </div>
  );
}