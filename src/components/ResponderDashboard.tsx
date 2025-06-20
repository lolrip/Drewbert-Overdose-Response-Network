import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Users, Clock, AlertCircle, CheckCircle, X, User, Settings, BarChart3, Crown, Wifi, WifiOff, RefreshCw, UserMinus } from 'lucide-react';
import { useAuth } from './AuthWrapper';
import { useAlerts } from '../hooks/useAlerts';
import { useRealTimeStats } from '../hooks/useRealTimeStats';
import { supabase } from '../lib/supabase';
import { useNotifications } from './Notification';

interface Alert {
  id: string;
  generalLocation: string;
  preciseLocation: string;
  responderCount: number;
  createdAt: string;
  status: 'active' | 'responded' | 'resolved' | 'cancelled';
  isCommitted?: boolean;
}

interface ResponderDashboardProps {
  onBack: () => void;
  onViewProfile: () => void;
}

interface ResponseDetails {
  ambulanceCalled: boolean;
  personOkay: boolean;
  naloxoneUsed: boolean;
  additionalNotes: string;
}

interface CancellationReason {
  reason: string;
  details?: string;
}

export function ResponderDashboard({ onBack, onViewProfile }: ResponderDashboardProps) {
  console.log('✨ [ResponderDashboard] Re-rendering');
  
  const { user } = useAuth();
  const { alerts: dbAlerts, userCommitments, loading: alertsLoading, error: alertsError, lastFetchTime, connectionStatus: alertsConnectionStatus, commitToAlert, cancelResponse, endResponse, refetch: refetchAlerts } = useAlerts();
  const { stats, loading: statsLoading, error: statsError, connectionStatus: statsConnectionStatus, refetch: refetchStats } = useRealTimeStats();
  const { showNotification } = useNotifications();
  const [showEndResponseForm, setShowEndResponseForm] = useState<string | null>(null);
  const [showCancelForm, setShowCancelForm] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [newDataReceived, setNewDataReceived] = useState(false);
  const [responseDetails, setResponseDetails] = useState<ResponseDetails>({
    ambulanceCalled: false,
    personOkay: false,
    naloxoneUsed: false,
    additionalNotes: '',
  });
  const [cancellationReason, setCancellationReason] = useState<CancellationReason>({
    reason: '',
    details: '',
  });

  console.log('📊 [ResponderDashboard] DB Alerts count:', dbAlerts.length);
  console.log('📊 [ResponderDashboard] Alert commitments count:', Object.keys(stats.alertCommitments).length);

  // Debug logging for component state
  useEffect(() => {
    console.log('🎯 [ResponderDashboard] Component state:', {
      dbAlertsCount: dbAlerts.length,
      userCommitmentsCount: Object.keys(userCommitments).length,
      alertsLoading,
      alertsError,
      lastFetchTime: lastFetchTime?.toISOString(),
      alertsConnectionStatus,
      statsConnectionStatus,
      statsLoading,
      statsError
    });
  }, [dbAlerts, userCommitments, alertsLoading, alertsError, lastFetchTime, alertsConnectionStatus, statsConnectionStatus, statsLoading, statsError]);

  // Visual feedback for new data
  useEffect(() => {
    if (lastFetchTime && !alertsLoading) {
      setNewDataReceived(true);
      const timer = setTimeout(() => setNewDataReceived(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastFetchTime, alertsLoading]);

  // Check admin status independently
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setAdminLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Failed to check admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data?.is_admin || false);
        }
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Convert database alerts to display format - only active, responded, and hide cancelled alerts
  const activeAlerts = dbAlerts
    .filter(alert => (alert.status === 'active' || alert.status === 'responded'))
    .map(alert => {
      const alertData = {
        id: alert.id,
        generalLocation: alert.general_location,
        preciseLocation: alert.precise_location,
        responderCount: stats.alertCommitments[alert.id] || alert.responder_count,
        createdAt: alert.created_at,
        status: alert.status as 'active' | 'responded' | 'resolved' | 'cancelled',
        isCommitted: userCommitments[alert.id] || false,
      };
      
      console.log('🔄 [ResponderDashboard] Processing alert:', {
        id: alert.id,
        dbResponderCount: alert.responder_count,
        statsResponderCount: stats.alertCommitments[alert.id],
        finalResponderCount: alertData.responderCount,
        isCommitted: alertData.isCommitted,
        status: alertData.status,
        createdAt: alertData.createdAt
      });
      
      return alertData;
    });

  console.log('📊 [ResponderDashboard] Active alerts count:', activeAlerts.length);

  const handleCommitToResponse = async (alertId: string) => {
    try {
      console.log('🚀 [ResponderDashboard] Committing to alert:', alertId);
      await commitToAlert(alertId);
      console.log('✅ [ResponderDashboard] Successfully committed to alert:', alertId);
      
      // Show success notification
      showNotification('You have committed to respond to this alert', 'success');
    } catch (error) {
      console.error('❌ [ResponderDashboard] Failed to commit to alert:', error);
      
      // Show error notification
      showNotification('Failed to commit to alert', 'error');
    }
  };

  const handleCancelResponse = async (alertId: string) => {
    try {
      console.log('🚫 [ResponderDashboard] Cancelling response for alert:', alertId);
      console.log('🔍 [ResponderDashboard] Current commitments before cancel:', userCommitments);
      
      await cancelResponse(alertId, cancellationReason);
      
      console.log('✅ [ResponderDashboard] Cancel response completed');
      console.log('🔍 [ResponderDashboard] Current commitments after cancel:', userCommitments);
      
      // Show success notification
      showNotification('Response cancelled successfully', 'info');
      
      setShowCancelForm(null);
      setCancellationReason({ reason: '', details: '' });
      
      // Check if any other responders are committed to this alert
      const activeResponderCount = stats.alertCommitments[alertId] || 0;
      console.log('🔍 [ResponderDashboard] Current responder count for alert:', alertId, 'is', activeResponderCount);
      
      // Force update the local state to hide this alert if we were the last responder
      if (activeResponderCount <= 1) {  // 1 because our cancellation hasn't been reflected in stats yet
        console.log('🛑 [ResponderDashboard] We were the last responder, forcing hide of alert:', alertId);
        
        // Update local state to immediately hide the alert even before refetch
        const updatedAlerts = dbAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'cancelled' as const } 
            : alert
        );
        
        // This is a bit of a hack, but we're directly setting alerts
        // to force an immediate UI update without waiting for refetch
        // @ts-ignore - Ignore the TypeScript error for direct state manipulation
        setAlerts(updatedAlerts);
      }
      
      // Force a manual refresh after short delay to ensure we get updated server state
      setTimeout(() => {
        console.log('🔄 [ResponderDashboard] Forcing manual refresh after cancellation');
        handleManualRefresh();
      }, 1000);
      
    } catch (error) {
      console.error('❌ [ResponderDashboard] Failed to cancel response:', error);
    }
  };

  const handleEndResponse = async (alertId: string) => {
    try {
      console.log('🏁 [ResponderDashboard] Ending response for alert:', alertId);
      await endResponse(alertId, responseDetails);
      console.log('✅ [ResponderDashboard] Successfully ended response for alert:', alertId);
      
      // Show success notification
      showNotification('Response completed successfully', 'success');
    } catch (error) {
      console.error('❌ [ResponderDashboard] Failed to end response:', error);
      
      // Show error notification
      showNotification('Failed to complete the response', 'error');
    }
    
    // Reset form and close modal
    setShowEndResponseForm(null);
    setResponseDetails({
      ambulanceCalled: false,
      personOkay: false,
      naloxoneUsed: false,
      additionalNotes: '',
    });
  };

  const formatTriggeredTime = (createdAt: string) => {
    const date = new Date(createdAt);
    return `Triggered on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  };

  const getStatusConfig = (status: Alert['status']) => {
    switch (status) {
      case 'active':
        return {
          color: 'text-coral-600',
          bg: 'bg-coral-50',
          border: 'border-coral-200',
          label: 'ACTIVE'
        };
      case 'responded':
        return {
          color: 'text-accent-600',
          bg: 'bg-accent-50',
          border: 'border-accent-200',
          label: 'RESPONDING'
        };
      case 'resolved':
        return {
          color: 'text-primary-600',
          bg: 'bg-primary-50',
          border: 'border-primary-200',
          label: 'RESOLVED'
        };
      case 'cancelled':
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          label: 'CANCELLED'
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          label: 'UNKNOWN'
        };
    }
  };

  // Determine overall connection status
  const overallConnectionStatus = alertsConnectionStatus === 'connected' && statsConnectionStatus === 'connected' 
    ? 'connected' 
    : alertsConnectionStatus === 'reconnecting' || statsConnectionStatus === 'reconnecting'
    ? 'reconnecting'
    : 'disconnected';

  const getConnectionStatusIcon = () => {
    switch (overallConnectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-primary-600" />;
      case 'reconnecting':
        return <RefreshCw className="w-4 h-4 text-accent-600 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-coral-600" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (overallConnectionStatus) {
      case 'connected':
        return 'Live';
      case 'reconnecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Offline';
    }
  };

  // Manual refresh function that refreshes both alerts and stats
  const handleManualRefresh = async () => {
    console.log('🔄 [ResponderDashboard] Manual refresh triggered');
    try {
      console.log('🔍 [ResponderDashboard] Alerts before refresh:', dbAlerts.map(a => ({ id: a.id, status: a.status, count: a.responder_count })));
      
      const results = await Promise.all([
        refetchAlerts(),
        refetchStats()
      ]);
      
      console.log('✅ [ResponderDashboard] Manual refresh completed, response:', results);
      
      // Log after a short delay to let state update
      setTimeout(() => {
        console.log('🔍 [ResponderDashboard] Alerts after refresh:', dbAlerts.map(a => ({ id: a.id, status: a.status, count: a.responder_count })));
        console.log('🔍 [ResponderDashboard] Active alerts shown:', activeAlerts.map(a => ({ id: a.id, status: a.status, count: a.responderCount })));
      }, 500);
    } catch (error) {
      console.error('❌ [ResponderDashboard] Manual refresh failed:', error);
    }
  };

  const AlertCard = ({ alert }: { alert: Alert }) => {
    const statusConfig = getStatusConfig(alert.status);

    return (
      <div className={`bg-white rounded-2xl shadow-lg border-2 ${statusConfig.border} p-6`}>
        {/* Alert Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${statusConfig.bg} rounded-lg p-2`}>
              <AlertCircle className={`w-5 h-5 ${statusConfig.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold font-space ${statusConfig.color} tracking-wide`}>
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 font-manrope">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTriggeredTime(alert.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span className="font-semibold text-primary-600">
                    {alert.responderCount} responding
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium font-space text-gray-900">
                Location
              </p>
              <p className="text-sm text-gray-700 font-manrope">
                {alert.generalLocation}
              </p>
            </div>
          </div>

          {alert.isCommitted && (
            <div className="flex items-start gap-3 bg-primary-50 rounded-lg p-3">
              <MapPin className="w-4 h-4 text-primary-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium font-space text-primary-900">
                  Precise Location (Committed Responder)
                </p>
                <p className="text-sm text-primary-700 font-manrope">
                  {alert.preciseLocation}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {!alert.isCommitted && alert.status === 'active' && (
            <button
              onClick={() => handleCommitToResponse(alert.id)}
              className="flex-1 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold font-space py-3 px-6 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Commit to Respond
            </button>
          )}

          {alert.isCommitted && alert.status !== 'resolved' && (
            <>
              <button
                onClick={() => setShowCancelForm(alert.id)}
                className="flex items-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold font-space rounded-xl transition-colors"
              >
                <UserMinus className="w-4 h-4" />
                Cancel Response
              </button>
              
              {/* New Get Directions Button */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(alert.preciseLocation)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold font-space py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <MapPin className="w-5 h-5" />
                Get Directions
              </a>

              <button
                onClick={() => setShowEndResponseForm(alert.id)}
                className="bg-coral-600 hover:bg-coral-700 text-white font-semibold font-space py-3 px-6 rounded-xl transition-colors"
              >
                End Response
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className={`bg-white shadow-sm sticky top-0 z-10 transition-colors duration-300 ${newDataReceived ? 'bg-primary-50' : ''}`}>
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold font-space text-gray-900">
                  Responder Dashboard
                </h1>
                <div className="flex items-center gap-2">
                  {getConnectionStatusIcon()}
                  <span className="text-xs text-gray-500 font-manrope">
                    {getConnectionStatusText()}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 font-manrope">
                Drewbert Overdose Detection & Response Network
                {lastFetchTime && (
                  <span className="ml-2 text-xs text-gray-500">
                    • Last updated: {lastFetchTime.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={alertsLoading || statsLoading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${(alertsLoading || statsLoading) ? 'animate-spin' : ''}`} />
            </button>
            
            {/* Admin Dashboard Button - Right in Header for Admins */}
            {!adminLoading && isAdmin && (
              <button
                onClick={onViewProfile}
                className="flex items-center gap-2 px-6 py-3 bg-coral-600 hover:bg-coral-700 text-white rounded-xl transition-colors shadow-lg animate-pulse-slow mr-4"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="font-semibold font-space">Admin Panel</span>
              </button>
            )}
            
            {/* Profile Button with Admin Crown */}
            <button
              onClick={onViewProfile}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors relative"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-manrope">Profile</span>
              {!adminLoading && isAdmin && (
                <Crown className="w-4 h-4 text-yellow-300 ml-1" />
              )}
            </button>
          </div>

          {/* Real-time Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary-600" />
                <span className="text-2xl font-bold font-space text-primary-900">
                  {stats.activeResponders}
                </span>
              </div>
              <p className="text-sm text-primary-700 font-manrope">Active Responders</p>
              <p className="text-xs text-primary-600 font-manrope mt-1">Currently online</p>
            </div>
            
            <div className="bg-accent-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-accent-600" />
                <span className="text-2xl font-bold font-space text-accent-900">
                  {stats.committedResponders}
                </span>
              </div>
              <p className="text-sm text-accent-700 font-manrope">Committed Responders</p>
              <p className="text-xs text-accent-600 font-manrope mt-1">Currently responding</p>
            </div>
            
            <div className="bg-coral-50 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-coral-600" />
                <span className="text-2xl font-bold font-space text-coral-900">
                  {activeAlerts.length}
                </span>
              </div>
              <p className="text-sm text-coral-700 font-manrope">Active Alerts</p>
              <p className="text-xs text-coral-600 font-manrope mt-1">Requiring response</p>
            </div>
          </div>

          {/* Connection Status Error */}
          {(alertsError || statsError) && (
            <div className="mt-4 bg-coral-50 border border-coral-200 rounded-lg p-3">
              <p className="text-coral-800 text-sm font-manrope">
                {alertsError && `Alerts Error: ${alertsError}`}
                {alertsError && statsError && ' | '}
                {statsError && `Stats Error: ${statsError}`}
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-6">
        <div className="max-w-4xl mx-auto">
          
          {alertsLoading && activeAlerts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-12 h-12 bg-primary-600 rounded-xl animate-pulse mx-auto mb-4"></div>
              <p className="text-gray-600 font-manrope">Loading alerts...</p>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold font-space text-gray-900 mb-4">
                Current Alerts ({activeAlerts.length})
                {overallConnectionStatus === 'connected' && (
                  <span className="ml-2 text-sm font-normal text-primary-600">• Live Updates</span>
                )}
              </h2>
              
              {activeAlerts.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <CheckCircle className="w-16 h-16 text-primary-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold font-space text-gray-900 mb-2">
                    All Clear
                  </h3>
                  <p className="text-gray-600 font-manrope">
                    No active alerts at this time. Thank you for being part of our community response network.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-8 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-semibold font-space text-gray-900 mb-2">Responder Guidelines</h3>
            <ul className="text-sm text-gray-600 font-manrope space-y-1">
              <li>• Only commit to alerts you can safely respond to</li>
              <li>• Precise location is revealed only after commitment</li>
              <li>• You can cancel your response if circumstances change</li>
              <li>• Call 911 if professional medical help is needed</li>
              <li>• Complete the response form to help improve our service</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Cancel Response Modal */}
      {showCancelForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold font-space text-gray-900">
                  Cancel Response
                </h3>
                <button
                  onClick={() => setShowCancelForm(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600 font-manrope">
                  Please let us know why you need to cancel your response. This helps us improve the system.
                </p>

                <div>
                  <label className="block text-sm font-medium font-space text-gray-900 mb-2">
                    Reason for cancellation
                  </label>
                  <select
                    value={cancellationReason.reason}
                    onChange={(e) => setCancellationReason(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-manrope focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a reason...</option>
                    <option value="emergency">Personal emergency</option>
                    <option value="location">Cannot reach location</option>
                    <option value="safety">Safety concerns</option>
                    <option value="other_responder">Another responder arrived first</option>
                    <option value="resolved">Situation already resolved</option>
                    <option value="other">Other reason</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium font-space text-gray-900 mb-2">
                    Additional details (optional)
                  </label>
                  <textarea
                    value={cancellationReason.details}
                    onChange={(e) => setCancellationReason(prev => ({ ...prev, details: e.target.value }))}
                    placeholder="Any additional information..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-manrope resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCancelForm(null)}
                    className="flex-1 px-4 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-manrope rounded-xl transition-colors"
                  >
                    Keep Response
                  </button>
                  <button
                    onClick={() => handleCancelResponse(showCancelForm)}
                    disabled={!cancellationReason.reason}
                    className="flex-1 bg-coral-600 hover:bg-coral-700 disabled:bg-gray-400 text-white font-semibold font-space py-3 px-4 rounded-xl transition-colors"
                  >
                    Cancel Response
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Response Modal */}
      {showEndResponseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold font-space text-gray-900">
                  End Response
                </h3>
                <button
                  onClick={() => setShowEndResponseForm(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-gray-600 font-manrope">
                  Please provide details about this response to help improve our community response system.
                </p>

                {/* Checkbox questions */}
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={responseDetails.ambulanceCalled}
                      onChange={(e) => setResponseDetails(prev => ({
                        ...prev,
                        ambulanceCalled: e.target.checked
                      }))}
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="font-manrope text-gray-900">Was an ambulance called?</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={responseDetails.naloxoneUsed}
                      onChange={(e) => setResponseDetails(prev => ({
                        ...prev,
                        naloxoneUsed: e.target.checked
                      }))}
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="font-manrope text-gray-900">Was naloxone (Narcan) used?</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={responseDetails.personOkay}
                      onChange={(e) => setResponseDetails(prev => ({
                        ...prev,
                        personOkay: e.target.checked
                      }))}
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="font-manrope text-gray-900">Was the person responsive/okay?</span>
                  </label>
                </div>

                {/* Additional notes */}
                <div>
                  <label className="block text-sm font-medium font-space text-gray-900 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={responseDetails.additionalNotes}
                    onChange={(e) => setResponseDetails(prev => ({
                      ...prev,
                      additionalNotes: e.target.value
                    }))}
                    placeholder="Any additional details about the response..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-manrope resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowEndResponseForm(null)}
                    className="flex-1 px-4 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-manrope rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleEndResponse(showEndResponseForm)}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold font-space py-3 px-4 rounded-xl transition-colors"
                  >
                    Submit & End
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}