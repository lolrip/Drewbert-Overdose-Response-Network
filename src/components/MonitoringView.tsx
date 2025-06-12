import { useEffect, useState, useRef } from 'react';
import { AlertCircle, CheckCircle, Heart, ArrowLeft, AlertTriangle, MessageCircle, MapPin, Edit3, Save, X } from 'lucide-react';
import { useMonitoring } from '../hooks/useMonitoring';
import { useMonitoringSession } from '../hooks/useMonitoringSession';
import { getCurrentLocation, reverseGeocode, formatGeneralLocation, formatPreciseLocation } from '../lib/location';
import { useNotifications } from './Notification';

interface MonitoringViewProps {
  onBack: () => void;
  onAlert: (location: { general: string; precise: string }) => void;
}

export function MonitoringView({ onBack, onAlert }: MonitoringViewProps) {
  const { state, startMonitoring, stopMonitoring, respondToCheckIn, setOnAlert } = useMonitoring();
  const { currentSession, startSession, updateCheckInCount, updateSessionLocation, endSession, createAlert } = useMonitoringSession();
  const { showNotification } = useNotifications();
  const [locationData, setLocationData] = useState<{ general: string; precise: string } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [isEditingPreciseLocation, setIsEditingPreciseLocation] = useState(false);
  const [editedPreciseLocation, setEditedPreciseLocation] = useState('');
  const [locationUpdateStatus, setLocationUpdateStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const initializedRef = useRef(false);

  // Collect location when component mounts
  useEffect(() => {
    const collectLocation = async () => {
      setIsLocationLoading(true);
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
      setIsLocationLoading(false);
    };

    collectLocation();
  }, []);

  // Start monitoring once location is ready (only run once)
  useEffect(() => {
    if (!isLocationLoading && locationData && !initializedRef.current) {
      console.log('Starting monitoring session...');
      initializedRef.current = true; // Set immediately to prevent race condition
      
      const initializeMonitoring = async () => {
        try {
          // Start database session
          const session = await startSession(locationData);
          console.log('Database session started:', session);
          
          // Show notification for session start
          showNotification('Monitoring started successfully', 'success');
          
          // Set up the alert callback
          setOnAlert(async () => {
            console.log('🚨 [MonitoringView] Alert callback triggered!');
            console.log('🚨 [MonitoringView] Session exists:', !!session);
            console.log('🚨 [MonitoringView] LocationData:', locationData);
            
            if (session) {
              try {
                console.log('🚨 [MonitoringView] About to call createAlert with sessionId:', session.id);
                
                // Create the alert in the database
                const alert = await createAlert(session.id, locationData);
                
                console.log('🚨 [MonitoringView] Alert created successfully:', alert);
                
                // Store alert info for EmergencyHelp to use
                const alertData = {
                  id: alert.id,
                  created_at: alert.created_at,
                  location: locationData,
                  source: 'monitoring_view'
                };
                
                sessionStorage.setItem('active_alert', JSON.stringify(alertData));
                console.log('🚨 [MonitoringView] Alert stored in sessionStorage:', alertData);
                
                // Navigate to emergency screen
                console.log('🚨 [MonitoringView] About to call onAlert to navigate');
                onAlert(locationData);
                console.log('🚨 [MonitoringView] onAlert called successfully');
              } catch (error) {
                console.error('🚨 [MonitoringView] Failed to create alert:', error);
                // Still trigger the UI alert even if database fails
                onAlert(locationData);
              }
            } else {
              console.log('🚨 [MonitoringView] No session, calling onAlert directly');
              onAlert(locationData);
            }
          });
          
          // Start monitoring
          console.log('Starting monitoring timer...');
          startMonitoring();
        } catch (error) {
          console.error('Failed to initialize monitoring:', error);
          initializedRef.current = false; // Reset to allow retry
        }
      };

      initializeMonitoring();
    }
  }, [isLocationLoading, locationData]); // Removed dependencies that could cause re-runs

  // Update check-in count in database when it changes
  useEffect(() => {
    if (currentSession && state.totalCheckins > 0) {
      updateCheckInCount(currentSession.id, state.totalCheckins).catch(console.error);
    }
  }, [currentSession, state.totalCheckins, updateCheckInCount]);

  // Only end session on explicit user action, not on unmounting or navigation
  // This ensures the monitoring session persists across navigation
  useEffect(() => {
    return () => {
      console.log('Component unmounting - preserving monitoring session...');
      // Stop local monitoring timers but don't end the session
      stopMonitoring();
      
      // We no longer automatically end the session on component unmount
      // Sessions will now persist until explicitly ended by the user
      // or until the page is refreshed
    };
  }, []); // Empty dependency array means this only runs on unmount

  const getPhaseConfig = () => {
    switch (state.phase) {
      case 'monitoring':
        return {
          title: 'Monitoring Active',
          subtitle: 'Regular check-in required',
          color: 'primary',
          icon: Heart,
          bgColor: 'bg-primary-50',
          textColor: 'text-primary-900',
          buttonColor: 'bg-primary-600 hover:bg-primary-700',
          progressColor: 'bg-primary-500',
          maxTime: 60,
        };
      case 'prompting':
        return {
          title: 'Check-in Time',
          subtitle: state.promptMessage,
          color: 'accent',
          icon: MessageCircle,
          bgColor: 'bg-accent-50',
          textColor: 'text-accent-900',
          buttonColor: 'bg-accent-600 hover:bg-accent-700',
          progressColor: 'bg-accent-500',
          maxTime: 60,
        };
      case 'final_warning':
        return {
          title: 'URGENT: Final Warning',
          subtitle: 'Emergency alert will be sent',
          color: 'coral',
          icon: AlertTriangle,
          bgColor: 'bg-coral-50',
          textColor: 'text-coral-900',
          buttonColor: 'bg-coral-600 hover:bg-coral-700',
          progressColor: 'bg-coral-500',
          maxTime: 10, // Updated to 10 seconds
        };
      case 'alert_sent':
        return {
          title: 'Alert Sent',
          subtitle: 'Community responders notified',
          color: 'coral',
          icon: AlertCircle,
          bgColor: 'bg-coral-100',
          textColor: 'text-coral-900',
          buttonColor: 'bg-coral-600 hover:bg-coral-700',
          progressColor: 'bg-coral-500',
          maxTime: 10,
        };
      default:
        return {
          title: 'Monitoring',
          subtitle: '',
          color: 'primary',
          icon: Heart,
          bgColor: 'bg-primary-50',
          textColor: 'text-primary-900',
          buttonColor: 'bg-primary-600 hover:bg-primary-700',
          progressColor: 'bg-primary-500',
          maxTime: 60,
        };
    }
  };

  const config = getPhaseConfig();
  const IconComponent = config.icon;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return (state.timeRemaining / config.maxTime) * 100;
  };

  const handleStopMonitoring = () => {
    console.log('Manually stopping monitoring...');
    stopMonitoring();
    
    if (currentSession) {
      endSession(currentSession.id, 'completed')
        .then(() => {
          // Show success notification
          showNotification('Monitoring stopped successfully', 'success');
          // Brief delay to allow notification to be seen
          setTimeout(() => {
            onBack();
          }, 1000);
        })
        .catch(error => {
          console.error('Failed to end session:', error);
          showNotification('Failed to end monitoring session', 'error');
          // Still navigate back
          setTimeout(() => {
            onBack();
          }, 1000);
        });
    } else {
      showNotification('Monitoring stopped', 'info');
      setTimeout(() => {
        onBack();
      }, 1000);
    }
  };

  const handleEditPreciseLocation = () => {
    if (locationData) {
      setEditedPreciseLocation(locationData.precise);
      setIsEditingPreciseLocation(true);
    }
  };

  const handleSavePreciseLocation = async () => {
    if (locationData && currentSession) {
      setLocationUpdateStatus('saving');
      
      try {
        const updatedLocationData = {
          ...locationData,
          precise: editedPreciseLocation
        };

        // Update the session location in the database
        await updateSessionLocation(currentSession.id, updatedLocationData);
        
        // Update local state
        setLocationData(updatedLocationData);
        setIsEditingPreciseLocation(false);
        setLocationUpdateStatus('saved');
        
        console.log('✅ Location updated successfully in database');
        
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

  if (isLocationLoading) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-12 h-12 bg-primary-600 rounded-xl animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600 font-manrope">
            {locationData ? 'Starting monitoring...' : 'Getting your location...'}
          </p>
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
    <div className={`min-h-screen ${config.bgColor} transition-colors duration-500`}>
      {/* Header */}
      <header className="px-6 py-4 bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-space text-gray-900">
              Safety Monitoring
            </h1>
            <p className="text-sm text-gray-600 font-manrope">
              Check-ins: {state.totalCheckins} | Phase: {state.phase}
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

      {/* Location Update Status */}
      {locationUpdateStatus !== 'idle' && (
        <div className="mx-6 mt-4">
          {locationUpdateStatus === 'saving' && (
            <div className="bg-accent-50 border border-accent-200 rounded-lg p-3">
              <p className="text-accent-800 text-sm font-manrope">
                💾 Saving location update...
              </p>
            </div>
          )}
          {locationUpdateStatus === 'saved' && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
              <p className="text-primary-800 text-sm font-manrope">
                ✅ Location updated successfully!
              </p>
            </div>
          )}
          {locationUpdateStatus === 'error' && (
            <div className="bg-coral-50 border border-coral-200 rounded-lg p-3">
              <p className="text-coral-800 text-sm font-manrope">
                ❌ Failed to update location. Please try again.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-md mx-auto space-y-8">
          
          {/* Status Card */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8 text-center">
            <div className={`w-20 h-20 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-6 ${
              state.phase === 'final_warning' ? 'animate-bounce-gentle' : ''
            }`}>
              <IconComponent className={`w-10 h-10 ${config.textColor}`} />
            </div>

            <h2 className={`text-2xl font-bold font-space ${config.textColor} mb-2`}>
              {config.title}
            </h2>
            <p className="text-gray-600 font-manrope mb-6">
              {config.subtitle}
            </p>

            {/* Timer */}
            <div className="mb-8">
              <div className={`text-5xl font-bold font-space ${config.textColor} mb-2`}>
                {formatTime(state.timeRemaining)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${config.progressColor}`}
                  style={{
                    width: `${Math.max(0, Math.min(100, getProgressPercentage()))}%`
                  }}
                />
              </div>
            </div>

            {/* Action Button */}
            {(state.phase === 'monitoring' || state.phase === 'prompting' || state.phase === 'final_warning') && (
              <button
                onClick={respondToCheckIn}
                className={`w-full ${config.buttonColor} text-white font-semibold font-space py-4 px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  state.phase === 'final_warning' || state.phase === 'prompting' ? 'animate-pulse' : ''
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle className="w-6 h-6" />
                  <span className="text-lg">
                    {state.phase === 'prompting' ? 'I\'m Doing Well' : 'I\'m OK'}
                  </span>
                </div>
              </button>
            )}

            {state.phase === 'alert_sent' && (
              <div className="bg-coral-100 border border-coral-200 rounded-xl p-4">
                <div className="flex items-center gap-3 text-coral-800">
                  <AlertCircle className="w-5 h-5" />
                  <p className="font-manrope font-medium">
                    Emergency alert has been sent to community responders
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Stop Monitoring Button */}
          <button
            onClick={handleStopMonitoring}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold font-space py-3 px-6 rounded-xl transition-colors"
          >
            Stop Monitoring
          </button>

          {/* Info Cards */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold font-space text-gray-900 mb-2">How it works</h3>
              <ul className="text-sm text-gray-600 font-manrope space-y-1">
                <li>• Drewbert will prompt you every 60 seconds</li>
                <li>• Respond to prompts by tapping the button</li>
                <li>• 10-second urgent warning if you miss a prompt</li>
                <li>• Automatic emergency dispatch if unresponsive</li>
              </ul>
            </div>

            {/* Your Location - Moved above Privacy */}
            {locationData && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold font-space text-gray-900">Your Location</h3>
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
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium font-space text-gray-900">Precise Location</h4>
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
                            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg font-manrope focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            rows={3}
                            placeholder="Enter your precise location..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSavePreciseLocation}
                              disabled={locationUpdateStatus === 'saving'}
                              className="flex items-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white text-sm font-manrope rounded-lg transition-colors"
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
                          <p className="text-sm text-gray-800 font-manrope mb-2 font-mono bg-white p-2 rounded border">
                            {locationData.precise}
                          </p>
                          <p className="text-xs text-gray-700 font-manrope mb-3">
                            This exact location is only shared with responders who commit to helping you.
                          </p>
                          <button
                            onClick={handleEditPreciseLocation}
                            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-manrope"
                          >
                            <Edit3 className="w-4 h-4" />
                            Edit Location
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Your Privacy - Moved below Location */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-semibold font-space text-gray-900 mb-2">Your Privacy</h3>
              <div className="space-y-2 text-sm text-gray-600 font-manrope">
                <p>
                  <strong>Two-tier location system:</strong> Your general area helps responders know where help is needed, while your precise location is only revealed to those who commit to respond.
                </p>
                <p>
                  <strong>Anonymous by default:</strong> You can use Drewbert without creating an account. Your identity remains protected throughout the process.
                </p>
                <p>
                  <strong>Secure data:</strong> All location data is encrypted and automatically deleted after the emergency is resolved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}