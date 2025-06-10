import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, withRetry } from '../lib/supabase';

interface Alert {
  id: string;
  session_id: string;
  user_id: string | null;
  anonymous_id: string | null;
  status: 'active' | 'responded' | 'resolved' | 'false_alarm';
  general_location: string;
  precise_location: string;
  responder_count: number;
  created_at: string;
  updated_at: string;
}

interface Response {
  id: string;
  alert_id: string;
  responder_id: string;
  status: 'committed' | 'en_route' | 'arrived' | 'completed';
  created_at: string;
  updated_at: string;
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

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [userCommitments, setUserCommitments] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  
  // Use refs to track subscriptions and prevent memory leaks
  const subscriptionsRef = useRef<any[]>([]);
  const isMountedRef = useRef(true);

  const fetchAlerts = useCallback(async () => {
    if (!isMountedRef.current) {
      console.log('🛑 [useAlerts] Component unmounted, skipping fetch');
      return;
    }
    
    try {
      const fetchStartTime = new Date();
      console.log('🔄 [useAlerts] Fetching alerts at:', fetchStartTime.toISOString());
      
      // First, let's check what user we're authenticated as
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 [useAlerts] Current user:', user?.id ? `authenticated (${user.id})` : 'anonymous');
      
      // For debugging: fetch ALL alerts to see what's in the database
      console.log('🔍 [useAlerts] Fetching ALL alerts for debugging...');
      const { data: allAlerts, error: allAlertsError } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!allAlertsError) {
        console.log('📊 [useAlerts] ALL alerts in database:', {
          total: allAlerts?.length || 0,
          alerts: allAlerts?.map(a => ({ 
            id: a.id, 
            status: a.status, 
            responder_count: a.responder_count,
            created_at: a.created_at,
            user_id: a.user_id,
            anonymous_id: a.anonymous_id
          })) || []
        });
      }

      // Fetch the filtered alerts (what we actually use) with retry logic and longer timeout
      console.log('🔍 [useAlerts] Fetching filtered alerts (active + responded)...');
      
      // Add a longer delay to ensure database consistency after alert creation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data, error } = await withRetry(() =>
        supabase
          .from('alerts')
          .select('*')
          .in('status', ['active', 'responded'])
          .order('created_at', { ascending: false }),
        5, // More retries
        800 // Longer delay between retries
      );

      if (error) {
        console.error('❌ [useAlerts] Error fetching filtered alerts:', error);
        throw error;
      }

      console.log('📊 [useAlerts] Filtered alerts fetched:', {
        count: data?.length || 0,
        alerts: data?.map(a => ({ 
          id: a.id, 
          status: a.status, 
          responder_count: a.responder_count,
          created_at: a.created_at,
          user_id: a.user_id,
          anonymous_id: a.anonymous_id
        })) || []
      });
      
      if (!isMountedRef.current) {
        console.log('🛑 [useAlerts] Component unmounted during fetch, aborting state update');
        return;
      }
      
      console.log('✅ [useAlerts] About to update alerts state with data:', data?.length || 0, 'alerts');
      setAlerts(data || []);
      setLastFetchTime(fetchStartTime);
      setError(null);
      
      // Fetch user's current commitments
      await fetchUserCommitments();
    } catch (err) {
      console.error('❌ [useAlerts] Failed to fetch alerts:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const fetchUserCommitments = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('🔍 [useAlerts] No user found, skipping commitments fetch');
        return;
      }

      console.log('🔄 [useAlerts] Fetching user commitments for user:', user.id);

      const { data, error } = await withRetry(() =>
        supabase
          .from('responses')
          .select('alert_id, status')
          .eq('responder_id', user.id)
          .in('status', ['committed', 'en_route', 'arrived'])
      );

      if (error) {
        console.error('❌ [useAlerts] Error fetching commitments:', error);
        throw error;
      }

      const commitments: Record<string, boolean> = {};
      data?.forEach(response => {
        commitments[response.alert_id] = true;
      });
      
      console.log('📊 [useAlerts] User commitments:', commitments);
      
      if (isMountedRef.current) {
        setUserCommitments(commitments);
      }
    } catch (err) {
      console.error('❌ [useAlerts] Failed to fetch user commitments:', err);
    }
  }, []);

  const commitToAlert = useCallback(async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be authenticated to respond to alerts');

      console.log('🚀 [useAlerts] Attempting to commit to alert:', alertId);

      // Check if user has already committed to this alert
      const { data: existingResponse, error: checkError } = await supabase
        .from('responses')
        .select('id')
        .eq('alert_id', alertId)
        .eq('responder_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingResponse) {
        console.log('ℹ️ [useAlerts] User has already committed to this alert');
        setUserCommitments(prev => ({ ...prev, [alertId]: true }));
        return; // User already committed, don't create duplicate
      }

      // Use the safe response creation function
      const { data, error } = await supabase.rpc('create_response_safe', {
        p_alert_id: alertId,
        p_responder_id: user.id,
        p_status: 'committed'
      });

      if (error) {
        console.error('❌ [useAlerts] RPC create_response_safe failed:', error);
        throw error;
      }

      console.log('✅ [useAlerts] Response created successfully:', data);

      // Only increment if we actually created a new response
      if (data) {
        // Increment responder count using safe function
        const { error: incrementError } = await supabase.rpc('increment_responder_count', {
          p_alert_id: alertId
        });

        if (incrementError) {
          console.error('❌ [useAlerts] Failed to increment responder count:', incrementError);
          // Don't throw here - the response was still created
        } else {
          console.log('✅ [useAlerts] Responder count incremented');
        }
      }

      // Update local state immediately for better UX
      setUserCommitments(prev => ({ ...prev, [alertId]: true }));

      // Force immediate refresh with multiple attempts to ensure we get the updated data
      console.log('🔄 [useAlerts] Forcing immediate refresh after commit');
      
      // Try multiple refreshes with increasing delays to handle timing issues
      const refreshAttempts = [200, 500, 1000, 2000];
      for (const delay of refreshAttempts) {
        setTimeout(() => {
          if (isMountedRef.current) {
            console.log(`🔄 [useAlerts] Refresh attempt after ${delay}ms`);
            fetchAlerts();
          }
        }, delay);
      }

    } catch (err) {
      console.error('❌ [useAlerts] Failed to commit to alert:', err);
      throw err;
    }
  }, [fetchAlerts]);

  const cancelResponse = useCallback(async (alertId: string, cancellationReason: CancellationReason) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be authenticated');

      console.log('🚫 [useAlerts] Cancelling response for alert:', alertId, 'Reason:', cancellationReason);

      // Use the safe cancellation function that handles both response deletion and count/status update
      const { data: success, error } = await supabase.rpc('cancel_response_safe', {
        p_alert_id: alertId,
        p_responder_id: user.id,
        p_reason: cancellationReason.reason + (cancellationReason.details ? ': ' + cancellationReason.details : '')
      });

      if (error) {
        console.error('❌ [useAlerts] Failed to cancel response:', error);
        throw error;
      }

      if (!success) {
        throw new Error('Response not found or already cancelled');
      }

      console.log('✅ [useAlerts] Response cancelled successfully');

      // Update local state immediately for better UX
      setUserCommitments(prev => {
        const updated = { ...prev };
        delete updated[alertId];
        return updated;
      });

      // Force immediate refresh with multiple attempts
      console.log('🔄 [useAlerts] Forcing immediate refresh after cancel');
      const refreshAttempts = [200, 500, 1000, 2000];
      for (const delay of refreshAttempts) {
        setTimeout(() => {
          if (isMountedRef.current) {
            console.log(`🔄 [useAlerts] Refresh attempt after ${delay}ms`);
            fetchAlerts();
          }
        }, delay);
      }

      // Log the cancellation for analytics
      console.log('📊 [useAlerts] Response cancelled:', {
        alertId,
        userId: user.id,
        reason: cancellationReason.reason,
        details: cancellationReason.details,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('❌ [useAlerts] Failed to cancel response:', err);
      throw err;
    }
  }, [fetchAlerts]);

  const endResponse = useCallback(async (alertId: string, details: ResponseDetails) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be authenticated');

      console.log('🏁 [useAlerts] Ending response for alert:', alertId);

      // Update the response status to completed with details
      const { error: responseError } = await supabase
        .from('responses')
        .update({ 
          status: 'completed',
          ambulance_called: details.ambulanceCalled,
          person_okay: details.personOkay,
          naloxone_used: details.naloxoneUsed,
          additional_notes: details.additionalNotes
        })
        .eq('alert_id', alertId)
        .eq('responder_id', user.id);

      if (responseError) throw responseError;

      // Update alert status to resolved
      const { error: alertError } = await supabase
        .from('alerts')
        .update({ status: 'resolved' })
        .eq('id', alertId);

      if (alertError) throw alertError;

      console.log('✅ [useAlerts] Response ended successfully');

      // Update local state
      setUserCommitments(prev => {
        const updated = { ...prev };
        delete updated[alertId];
        return updated;
      });

      // Force immediate refresh with multiple attempts
      console.log('🔄 [useAlerts] Forcing immediate refresh after end response');
      const refreshAttempts = [200, 500, 1000, 2000];
      for (const delay of refreshAttempts) {
        setTimeout(() => {
          if (isMountedRef.current) {
            console.log(`🔄 [useAlerts] Refresh attempt after ${delay}ms`);
            fetchAlerts();
          }
        }, delay);
      }

    } catch (err) {
      console.error('❌ [useAlerts] Failed to end response:', err);
      throw err;
    }
  }, [fetchAlerts]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 [useAlerts] Cleaning up subscriptions');
    
    // Unsubscribe from all channels
    subscriptionsRef.current.forEach(subscription => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error('❌ [useAlerts] Error unsubscribing:', error);
      }
    });
    subscriptionsRef.current = [];
  }, []);

  // Manual refresh function with debug logging
  const refetch = useCallback(async () => {
    console.log('🔄 [useAlerts] Manual refresh triggered by user');
    setLoading(true);
    await fetchAlerts();
  }, [fetchAlerts]);

  // Set up real-time subscription with comprehensive error handling and debug logging
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    console.log('🚀 [useAlerts] Component mounted, starting initial fetch');
    fetchAlerts();

    // Set up real-time subscriptions with better error handling and unique channel names
    console.log('🔌 [useAlerts] Setting up real-time subscriptions...');
    
    const alertsSubscription = supabase
      .channel(`alerts-dashboard-changes-${Date.now()}-${Math.random()}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'alerts' },
        (payload) => {
          console.log('🚨 [useAlerts] Alert change detected:', {
            eventType: payload.eventType,
            alertId: payload.new?.id || payload.old?.id,
            newStatus: payload.new?.status,
            oldStatus: payload.old?.status,
            newResponderCount: payload.new?.responder_count,
            oldResponderCount: payload.old?.responder_count,
            timestamp: new Date().toISOString()
          });
          
          // Multiple immediate fetches with delays to handle timing issues
          if (isMountedRef.current) {
            console.log('🔄 [useAlerts] Triggering immediate fetch due to alert change');
            
            // Immediate fetch
            fetchAlerts();
            
            // Additional fetches with delays to catch any timing issues
            setTimeout(() => {
              if (isMountedRef.current) {
                console.log('🔄 [useAlerts] Secondary fetch after 400ms');
                fetchAlerts();
              }
            }, 400);
            
            setTimeout(() => {
              if (isMountedRef.current) {
                console.log('🔄 [useAlerts] Tertiary fetch after 1000ms');
                fetchAlerts();
              }
            }, 1000);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [useAlerts] Alerts subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [useAlerts] Successfully subscribed to alerts changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.log('❌ [useAlerts] Alerts subscription failed, status:', status);
        }
      });

    const responsesSubscription = supabase
      .channel(`responses-dashboard-changes-${Date.now()}-${Math.random()}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'responses' },
        (payload) => {
          console.log('👥 [useAlerts] Response change detected:', {
            eventType: payload.eventType,
            responseId: payload.new?.id || payload.old?.id,
            alertId: payload.new?.alert_id || payload.old?.alert_id,
            responderId: payload.new?.responder_id || payload.old?.responder_id,
            status: payload.new?.status,
            timestamp: new Date().toISOString()
          });
          
          // Multiple immediate fetches with delays to handle timing issues
          if (isMountedRef.current) {
            console.log('🔄 [useAlerts] Triggering immediate fetch due to response change');
            
            // Immediate fetch
            fetchAlerts();
            
            // Additional fetches with delays
            setTimeout(() => {
              if (isMountedRef.current) {
                console.log('🔄 [useAlerts] Secondary fetch after 400ms');
                fetchAlerts();
              }
            }, 400);
            
            setTimeout(() => {
              if (isMountedRef.current) {
                console.log('🔄 [useAlerts] Tertiary fetch after 1000ms');
                fetchAlerts();
              }
            }, 1000);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [useAlerts] Responses subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [useAlerts] Successfully subscribed to responses changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.log('❌ [useAlerts] Responses subscription failed, status:', status);
        }
      });

    // Store subscriptions for cleanup
    subscriptionsRef.current = [alertsSubscription, responsesSubscription];

    // Cleanup on unmount
    return () => {
      console.log('🧹 [useAlerts] Component unmounting, setting isMountedRef to false');
      isMountedRef.current = false;
      cleanup();
    };
  }, [fetchAlerts, cleanup]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('📊 [useAlerts] State updated:', {
      alertsCount: alerts.length,
      userCommitmentsCount: Object.keys(userCommitments).length,
      loading,
      error,
      lastFetchTime: lastFetchTime?.toISOString(),
      alerts: alerts.map(a => ({ 
        id: a.id, 
        status: a.status, 
        responder_count: a.responder_count,
        isCommitted: userCommitments[a.id] || false,
        created_at: a.created_at
      }))
    });
  }, [alerts, userCommitments, loading, error, lastFetchTime]);

  return {
    alerts,
    userCommitments,
    loading,
    error,
    lastFetchTime,
    commitToAlert,
    cancelResponse,
    endResponse,
    refetch,
  };
}