import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, withRetry } from '../lib/supabase';

interface Alert {
  id: string;
  session_id: string;
  user_id: string | null;
  anonymous_id: string | null;
  status: 'active' | 'responded' | 'resolved' | 'cancelled' | 'false_alarm';
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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  
  // Use refs to track subscriptions and prevent memory leaks
  const subscriptionsRef = useRef<any[]>([]);
  const isMountedRef = useRef(true);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!isMountedRef.current) {
      console.log('🛑 [useAlerts] Component unmounted, skipping fetch');
      return;
    }
    
    try {
      const fetchStartTime = new Date();
      console.log('🔄 [useAlerts] Fetching alerts at:', fetchStartTime.toISOString(), '(Cached data may appear below)');
      
      // First, let's check what user we're authenticated as
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 [useAlerts] Current user:', user?.id ? `authenticated (${user.id})` : 'anonymous');
      
      // Store user ID for stable channel names
      userIdRef.current = user?.id || null;

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
          .in('status', ['active', 'responded', 'cancelled'])
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
      setConnectionStatus('connected');
      
      // Fetch user's current commitments
      await fetchUserCommitments();
    } catch (err) {
      console.error('❌ [useAlerts] Failed to fetch alerts:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
        setConnectionStatus('disconnected');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Debounced fetch function to prevent race conditions
  const debouncedFetchAlerts = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('🔄 [useAlerts] Debounced fetch triggered');
        fetchAlerts();
      }
    }, 300);
  }, [fetchAlerts]);

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

  // Start polling fallback when subscriptions fail
  const startPollingFallback = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    console.log('🔄 [useAlerts] Starting polling fallback (5s interval)');
    pollingTimerRef.current = setInterval(() => {
      if (isMountedRef.current) {
        console.log('⏰ [useAlerts] Polling fallback fetch');
        setConnectionStatus('reconnecting');
        fetchAlerts();
      }
    }, 5000); // Reduced to 5 seconds for more responsive updates
  }, [fetchAlerts]);

  // Stop polling fallback when subscriptions work
  const stopPollingFallback = useCallback(() => {
    if (pollingTimerRef.current) {
      console.log('🛑 [useAlerts] Stopping polling fallback');
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
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

      // Trigger debounced refresh
      debouncedFetchAlerts();

    } catch (err) {
      console.error('❌ [useAlerts] Failed to commit to alert:', err);
      throw err;
    }
  }, [debouncedFetchAlerts]);

  const cancelResponse = useCallback(async (alertId: string, cancellationReason: CancellationReason) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be authenticated');

      console.log('🚫 [useAlerts] Cancelling response for alert:', alertId, 'Reason:', cancellationReason);
      console.log('🔍 [useAlerts] User ID:', user.id);
      console.log('🔍 [useAlerts] Current commitments before cancel:', userCommitments);

      // Try to use the safe cancellation function first
      let success = false;
      let error = null;

      console.log('📞 [useAlerts] Trying cancel_response_safe function first...');
      try {
        const result = await supabase.rpc('cancel_response_safe', {
          p_alert_id: alertId,
          p_responder_id: user.id,
          p_reason: cancellationReason.reason + (cancellationReason.details ? ': ' + cancellationReason.details : '')
        });
        
        success = result.data;
        error = result.error;
        console.log('📞 [useAlerts] cancel_response_safe returned:', { success, error });
      } catch (rpcError) {
        console.error('❌ [useAlerts] RPC call failed:', rpcError);
        error = rpcError;
      }

      // If the RPC function fails, perform manual fallback cancellation
      if (error || !success) {
        console.log('🔄 [useAlerts] RPC function failed, trying manual fallback...');

        // STEP 1: Delete the response record
        console.log('🗑️ [useAlerts] Deleting response record...');
        const { error: deleteError } = await supabase
          .from('responses')
          .delete()
          .eq('alert_id', alertId)
          .eq('responder_id', user.id);

        if (deleteError) {
          console.error('❌ [useAlerts] Failed to delete response:', deleteError);
          throw deleteError;
        }

        // STEP 2: Save cancellation reason (if the cancellations table exists)
        try {
          console.log('📝 [useAlerts] Saving cancellation reason...');
          await supabase
            .from('response_cancellations')
            .insert({
              alert_id: alertId,
              responder_id: user.id,
              reason: cancellationReason.reason,
              details: cancellationReason.details || null
            });
        } catch (cancellationError) {
          // This might fail if the table doesn't exist yet, which is fine
          console.log('ℹ️ [useAlerts] Could not save cancellation reason:', cancellationError);
        }

        // STEP 3: Decrement the responder count
        console.log('🔻 [useAlerts] Decrementing responder count...');
        const { data: alertData } = await supabase
          .from('alerts')
          .select('responder_count')
          .eq('id', alertId)
          .single();

        const currentCount = alertData?.responder_count || 0;
        const newCount = Math.max(0, currentCount - 1);

        // STEP 4: Update the alert - set to cancelled if no more responders
        console.log('🔄 [useAlerts] Updating alert status...', {
          currentCount,
          newCount,
          willCancelAlert: newCount === 0
        });
        
        if (newCount === 0) {
          // No more responders, set status to cancelled
          const { data: updateData, error: updateError } = await supabase
            .from('alerts')
            .update({ 
              responder_count: newCount,
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
            .eq('id', alertId);
          
          if (updateError) {
            console.error('❌ [useAlerts] Failed to update alert status:', updateError);
          } else {
            console.log('✅ [useAlerts] Alert status updated to cancelled');
          }
        } else {
          // Still has responders, just update the count
          const { data: updateData, error: updateError } = await supabase
            .from('alerts')
            .update({ 
              responder_count: newCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', alertId);
          
          if (updateError) {
            console.error('❌ [useAlerts] Failed to update responder count:', updateError);
          } else {
            console.log('✅ [useAlerts] Responder count updated to', newCount);
          }
        }
      }

      console.log('✅ [useAlerts] Response cancelled successfully');

      // Update local state immediately for better UX
      console.log('🔄 [useAlerts] Updating local state...');
      setUserCommitments(prev => {
        const updated = { ...prev };
        delete updated[alertId];
        console.log('🔄 [useAlerts] Updated commitments:', updated);
        return updated;
      });

      // Trigger debounced refresh
      console.log('🔄 [useAlerts] Triggering debounced refresh...');
      debouncedFetchAlerts();

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
  }, [debouncedFetchAlerts]);

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

      // Trigger debounced refresh
      debouncedFetchAlerts();

    } catch (err) {
      console.error('❌ [useAlerts] Failed to end response:', err);
      throw err;
    }
  }, [debouncedFetchAlerts]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 [useAlerts] Cleaning up subscriptions and timers');
    
    // Unsubscribe from all channels
    subscriptionsRef.current.forEach(subscription => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error('❌ [useAlerts] Error unsubscribing:', error);
      }
    });
    subscriptionsRef.current = [];

    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Clear polling timer
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // Manual refresh function with debug logging
  const refetch = useCallback(async () => {
    console.log('🔄 [useAlerts] Manual refresh triggered by user');
    setLoading(true);
    setConnectionStatus('reconnecting');
    
    // Force a direct fetch of alerts bypassing any caching
    console.log('⚡ [useAlerts] Forcing direct database query...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Fetch ALL alerts directly with no caching
      const { data: directAlerts, error } = await supabase
        .from('alerts')
        .select('*')
        .in('status', ['active', 'responded', 'cancelled'])
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ [useAlerts] Direct database query failed:', error);
      } else {
        console.log('📊 [useAlerts] Direct database query results:', {
          count: directAlerts?.length || 0,
          alerts: directAlerts?.map(a => ({ 
            id: a.id, 
            status: a.status, 
            responder_count: a.responder_count,
          })) || []
        });
      }
      
      // Now use the normal fetch path
      await fetchAlerts();
    } catch (error) {
      console.error('❌ [useAlerts] Manual refresh error:', error);
      await fetchAlerts(); // Still try the normal path as fallback
    }
  }, [fetchAlerts]);

  // Set up real-time subscription with stable channel names and robust error handling
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    console.log('🚀 [useAlerts] Component mounted, starting initial fetch');
    fetchAlerts();

    // Set up real-time subscriptions with stable channel names
    console.log('🔌 [useAlerts] Setting up real-time subscriptions...');
    
    const setupSubscriptions = async () => {
      // Get user ID for stable channel names
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'anonymous';
      const timestamp = Date.now();
      
      console.log('🔧 [useAlerts] Creating subscriptions for user:', userId);

      const alertsSubscription = supabase
        .channel(`alerts-dashboard-${userId}-${timestamp}`) // Add timestamp for unique channel
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
            
            if (isMountedRef.current) {
              console.log('🔄 [useAlerts] Triggering immediate fetch due to alert change');
              setConnectionStatus('reconnecting');
              // Use immediate fetch for more responsive updates
              fetchAlerts();
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 [useAlerts] Alerts subscription status:', status);
          if (!isMountedRef.current) return;
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ [useAlerts] Successfully subscribed to alerts changes');
            setConnectionStatus('connected');
            stopPollingFallback();
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            console.log('❌ [useAlerts] Alerts subscription failed, starting polling fallback');
            setConnectionStatus('disconnected');
            startPollingFallback();
          }
        });

      const responsesSubscription = supabase
        .channel(`responses-dashboard-${userId}-${timestamp}`) // Add timestamp for unique channel
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
            
            if (isMountedRef.current) {
              console.log('🔄 [useAlerts] Triggering immediate fetch due to response change');
              setConnectionStatus('reconnecting');
              // Use immediate fetch for more responsive updates
              fetchAlerts();
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 [useAlerts] Responses subscription status:', status);
          if (!isMountedRef.current) return;
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ [useAlerts] Successfully subscribed to responses changes');
            setConnectionStatus('connected');
            stopPollingFallback();
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            console.log('❌ [useAlerts] Responses subscription failed, starting polling fallback');
            setConnectionStatus('disconnected');
            startPollingFallback();
          }
        });

      // Store subscriptions for cleanup
      subscriptionsRef.current = [alertsSubscription, responsesSubscription];
      
      console.log('📋 [useAlerts] Subscriptions created and stored:', {
        alertsChannel: alertsSubscription.topic,
        responsesChannel: responsesSubscription.topic
      });
    };

    setupSubscriptions();

    // Start polling fallback immediately as a safety net
    setTimeout(() => {
      if (isMountedRef.current && connectionStatus !== 'connected') {
        console.log('🚨 [useAlerts] Starting immediate polling fallback as safety net');
        startPollingFallback();
      }
    }, 3000); // Give subscriptions 3 seconds to connect

    // Cleanup on unmount
    return () => {
      console.log('🧹 [useAlerts] Component unmounting, setting isMountedRef to false');
      isMountedRef.current = false;
      cleanup();
    };
  }, []); // Remove all dependencies to prevent re-subscription

  // Debug logging for state changes
  useEffect(() => {
    console.log('📊 [useAlerts] State updated:', {
      alertsCount: alerts.length,
      userCommitmentsCount: Object.keys(userCommitments).length,
      loading,
      error,
      connectionStatus,
      lastFetchTime: lastFetchTime?.toISOString(),
      alerts: alerts.map(a => ({ 
        id: a.id, 
        status: a.status, 
        responder_count: a.responder_count,
        isCommitted: userCommitments[a.id] || false,
        created_at: a.created_at
      }))
    });
  }, [alerts, userCommitments, loading, error, connectionStatus, lastFetchTime]);

  return {
    alerts,
    userCommitments,
    loading,
    error,
    lastFetchTime,
    connectionStatus,
    commitToAlert,
    cancelResponse,
    endResponse,
    refetch,
  };
}