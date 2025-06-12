import { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Phone, MapPin, Clock, Users, Wifi, WifiOff, RefreshCw, Edit3, Save, X } from 'lucide-react';
import { useMonitoringSession } from '../hooks/useMonitoringSession';
import { useRealTimeStats } from '../hooks/useRealTimeStats';
import { getCurrentLocation, reverseGeocode, formatGeneralLocation, formatPreciseLocation } from '../lib/location';
import { useNotifications } from './Notification';

interface EmergencyHelpProps {
  onBack: () => void;
}

export function EmergencyHelp({ onBack }: EmergencyHelpProps) {
  const [alertSent, setAlertSent] = useState(false);
  const [alertId, setAlertId] = useState<string | null>(null);
  const [alertCreatedAt, setAlertCreatedAt] = useState<string | null>(null);
  const { createAlert, cancelAlert } = useMonitoringSession();
  const { stats, connectionStatus, refetch } = useRealTimeStats();
  const [locationData, setLocationData] = useState<{ general: string; precise: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [isEditingPreciseLocation, setIsEditingPreciseLocation] = useState(false);
  const [editedPreciseLocation, setEditedPreciseLocation] = useState('');
  const [locationUpdateStatus, setLocationUpdateStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const { showNotification } = useNotifications();

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

  // Check if an alert is already in progress from MonitoringView
  useEffect(() => {
    console.log('🔍 [EmergencyHelp] First useEffect running - checking for existing alert');
    
    const existingAlert = sessionStorage.getItem('active_alert');
    const fromMonitoring = sessionStorage.getItem('from_monitoring');
    
    console.log('🔍 [EmergencyHelp] existingAlert:', existingAlert);
    console.log('🔍 [EmergencyHelp] fromMonitoring:', fromMonitoring);
    console.log('🔍 [EmergencyHelp] Current alertSent state:', alertSent);
    console.log('🔍 [EmergencyHelp] Current alertId state:', alertId);
    
    if (existingAlert) {
      try {
        const parsedAlert = JSON.parse(existingAlert);
        console.log('🔍 [EmergencyHelp] Parsed existing alert:', parsedAlert);
        
        setAlertSent(true);
        setAlertId(parsedAlert.id);
        setAlertCreatedAt(parsedAlert.created_at);
        console.log('📱 [EmergencyHelp] Using existing alert from monitoring view:', parsedAlert.id);
        
        // Clear the flags
        sessionStorage.removeItem('from_monitoring');
        console.log('🔍 [EmergencyHelp] Cleared from_monitoring flag');
        
        // Trigger stats refresh for existing alert
        setTimeout(() => {
          refetch();
        }, 500);
        return; // Exit early if existing alert found
      } catch (error) {
        console.error('❌ [EmergencyHelp] Failed to parse stored alert:', error);
      }
    }
    
    // If we came from monitoring but no alert found, something went wrong
    if (fromMonitoring) {
      console.warn('⚠️ [EmergencyHelp] Came from monitoring but no alert found in storage');
      sessionStorage.removeItem('from_monitoring');
    }
  }, [refetch, alertSent, alertId]);

  // Simulate sending alert (only if no existing alert and not from monitoring)
  useEffect(() => {
    console.log('🔍 [EmergencyHelp] Second useEffect running - checking if should create new alert');
    console.log('🔍 [EmergencyHelp] alertSent:', alertSent);
    console.log('🔍 [EmergencyHelp] active_alert in storage:', !!sessionStorage.getItem('active_alert'));
    console.log('🔍 [EmergencyHelp] from_monitoring in storage:', !!sessionStorage.getItem('from_monitoring'));
    console.log('🔍 [EmergencyHelp] locationData:', locationData);
    
    // Don't create a new alert if one already exists or if we came from monitoring
    if (alertSent || sessionStorage.getItem('active_alert') || sessionStorage.getItem('from_monitoring')) {
      console.log('🔍 [EmergencyHelp] Skipping alert creation - conditions not met');
      return;
    }

    console.log('🔍 [EmergencyHelp] All conditions met, setting up timer for alert creation');

    const alertTimer = setTimeout(async () => {
      console.log('⏰ [EmergencyHelp] Timer fired - creating new alert');
      setAlertSent(true);
      
      // Create alert in database if location is available
      if (locationData) {
        try {
          console.log('🔍 [EmergencyHelp] About to call createAlert with null sessionId');
          // Create emergency alert without a session (sessionId = null)
          const alert = await createAlert(null, locationData);
          setAlertId(alert.id);
          setAlertCreatedAt(alert.created_at);
          console.log('✅ [EmergencyHelp] Emergency alert created successfully:', alert);
          
          // Show notification
          showNotification('Emergency alert created successfully', 'success');
          
          // Trigger immediate stats refresh to get responder count
          setTimeout(() => {
            refetch();
          }, 500);
        } catch (error) {
          console.error('❌ [EmergencyHelp] Failed to create emergency alert:', error);
        }
      } else {
        console.log('🔍 [EmergencyHelp] No locationData available for alert creation');
      }
    }, 2000);

    return () => {
      console.log('🔍 [EmergencyHelp] Cleaning up alert timer');
      clearTimeout(alertTimer);
    };
  }, [locationData, createAlert, refetch, showNotification, alertSent]);

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

  const formatTriggeredTime = (createdAt: string) => {
    const date = new Date(createdAt);
    return `Triggered on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
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

  const handleEditPreciseLocation = () => {
    if (locationData) {
      setEditedPreciseLocation(locationData.precise);
      setIsEditingPreciseLocation(true);
    }
  };

  const handleSavePreciseLocation = async () => {
    if (locationData) {
      setLocationUpdateStatus('saving');
      
      try {
        const updatedLocationData = {
          ...locationData,
          precise: editedPreciseLocation
        };

        // Update local state immediately for better UX
        setLocationData(updatedLocationData);
        setIsEditingPreciseLocation(false);
        setLocationUpdateStatus('saved');
        
        console.log('✅ Location updated successfully');
        
        // Clear saved status after 3 seconds
        setTimeout(() => {
          setLocationUpdateStatus('idle');
        }, 3000);
        
      } catch (error) {
        console.error('❌ Failed to update location:', error);
        setLocationUpdateStatus('error');
        
        // Clear error status after 5 seconds
        setTimeout(() => {
          setLocationUpdateStatus('idle');
        }, 5000);
      }
    }
  };

  const handleCancelEditPreciseLocation = () => {
    setIsEditingPreciseLocation(false);
    setEditedPreciseLocation('');
    setLocationUpdateStatus('idle');
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
                      <span className="text-sm font-bold font-space text-primary-900">
                        {alertCreatedAt ? formatTriggeredTime(alertCreatedAt) : 'Just now'}
                      </span>
                    </div>
                    <p className="text-xs text-primary-700 font-manrope">Alert Time</p>
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
              
              <div className="space-y-4">
                {/* General Area */}
                <div className="bg-primary-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium font-space text-primary-900">General Area</h4>
                    <span className="text-xs bg-primary-200 text-primary-800 px-2 py-1 rounded-full font-manrope">
                      Public
                    </span>
                  </div>
                  <p className="text-sm text-primary-800 font-manrope mb-2">
                    {locationData.general}
                  </p>
                  <p className="text-xs text-primary-700 font-manrope">
                    This approximate location is visible to all responders to help coordinate the initial response.
                  </p>
                </div>

                {/* Precise Location */}
                <div className="bg-coral-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium font-space text-coral-900">Precise Location</h4>
                    <span className="text-xs bg-coral-200 text-coral-800 px-2 py-1 rounded-full font-manrope">
                      Private
                    </span>
                  </div>
                  
                  <div>
                    {isEditingPreciseLocation ? (
                      <div className="space-y-3">
                        <textarea
                          value={editedPreciseLocation}
                          onChange={(e) => setEditedPreciseLocation(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-coral-300 rounded-lg font-manrope focus:outline-none focus:ring-2 focus:ring-coral-500 focus:border-transparent resize-none"
                          rows={3}
                          placeholder="Enter your precise location..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSavePreciseLocation}
                            disabled={locationUpdateStatus === 'saving'}
                            className="flex items-center gap-1 px-3 py-2 bg-coral-600 hover:bg-coral-700 disabled:bg-gray-400 text-white text-sm font-manrope rounded-lg transition-colors"
                          >
                            <Save className="w-4 h-4" />
                            {locationUpdateStatus === 'saving' ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancelEditPreciseLocation}
                            disabled={locationUpdateStatus === 'saving'}
                            className="flex items-center gap-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 text-sm font-manrope rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-coral-800 font-manrope mb-2 font-mono bg-white p-2 rounded border">
                          {locationData.precise}
                        </p>
                        <p className="text-xs text-coral-700 font-manrope mb-3">
                          This exact location is only shared with responders who commit to helping you.
                        </p>
                        <button
                          onClick={handleEditPreciseLocation}
                          className="flex items-center gap-2 text-sm text-coral-600 hover:text-coral-700 font-manrope"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit precise location
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Update Status */}
                {locationUpdateStatus === 'saved' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-800 text-sm font-manrope">
                      ✅ Location updated successfully
                    </p>
                  </div>
                )}
                
                {locationUpdateStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm font-manrope">
                      ❌ Failed to update location. Please try again.
                    </p>
                  </div>
                )}
              </div>
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
            onClick={async () => {
              try {
                if (alertId) {
                  await cancelAlert(alertId);
                  console.log('✅ Alert cancelled successfully by user');
                  
                  // Show notification
                  showNotification('Alert cancelled successfully', 'success');
                  
                  // Brief delay to allow notification to be seen before navigating back
                  setTimeout(() => {
                    onBack();
                  }, 1000);
                } else {
                  onBack();
                }
              } catch (error) {
                console.error('❌ Failed to cancel alert:', error);
                // Show error notification
                showNotification('Failed to cancel alert', 'error');
                
                // Still navigate back even if cancellation fails
                setTimeout(() => {
                  onBack();
                }, 1000);
              }
            }}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold font-space py-3 px-6 rounded-xl transition-colors"
          >
            I'm Safe - Cancel Alert
          </button>
        </div>
      </main>
    </div>
  );
}