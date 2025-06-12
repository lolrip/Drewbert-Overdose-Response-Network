import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, withRetry } from '../lib/supabase';

interface RealTimeStats {
  activeResponders: number; // now tracks online responders
  committedResponders: number;
  alertCommitments: Record<string, number>; // alertId -> number of committed responders
}

interface ConnectionStatus {
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected';
}

interface OnlineUser {
  user_id: string;
  last_seen_at: string;
}

export function useRealTimeStats() {
  const [stats, setStats] = useState<RealTimeStats>({
    activeResponders: 0,
    committedResponders: 0,
    alertCommitments: {},
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus['connectionStatus']>('disconnected');
  
  // Use refs to track subscriptions and prevent memory leaks
  const subscriptionsRef = useRef<any[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchStats = useCallback(async () => {
    if (!isMountedRef.current) {
      console.log('🛑 [useRealTimeStats] Component unmounted, skipping fetch');
      return;
    }
    
    try {
      console.log('🔄 [useRealTimeStats] Fetching real-time stats...');
      setError(null);
      
      // Don't set loading to true on subsequent fetches to avoid UI flicker
      if (stats.activeResponders === 0 && stats.committedResponders === 0) {
        setLoading(true);
      }

      // Try using the optimized function first
      try {
        console.log('🔄 [useRealTimeStats] Using optimized stats function...');
        const { data: optimizedStats, error: optimizedError } = await supabase.rpc('get_alert_stats');
        
        if (!optimizedError && optimizedStats) {
          console.log('✅ [useRealTimeStats] Got optimized stats:', optimizedStats);
          
          if (!isMountedRef.current) {
            console.log('🛑 [useRealTimeStats] Component unmounted during optimized fetch, aborting');
            return;
          }
          
          setStats({
            activeResponders: optimizedStats.active_responders || 0,
            committedResponders: optimizedStats.committed_responders || 0,
            alertCommitments: optimizedStats.alert_commitments || {},
          });
          
          setConnectionStatus('connected');
          setLoading(false);
          return; // Success, exit early
        } else {
          console.log('⚠️ [useRealTimeStats] Optimized function failed:', optimizedError);
          console.log('⚠️ [useRealTimeStats] Falling back to manual queries');
        }
      } catch (optimizedErr) {
        console.log('⚠️ [useRealTimeStats] Optimized function error, falling back:', optimizedErr);
      }

      // Fallback to manual queries with longer delays to handle timing issues
      console.log('🔄 [useRealTimeStats] Using fallback manual queries...');
      
      // Add delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 300));

      // Fetch all data with proper error handling and retries
      // Now including last_seen_at for online responder tracking
      const [respondersResult, responsesResult, alertsResult] = await Promise.allSettled([
        withRetry(() => supabase
          .from('profiles')
          .select('id, is_responder, last_seen_at')
          .eq('is_responder', true), 3, 300),
        withRetry(() => supabase
          .from('responses')
          .select('alert_id, responder_id, status')
          .in('status', ['committed', 'en_route', 'arrived']), 3, 300),
        withRetry(() => supabase
          .from('alerts')
          .select('id, responder_count, status')
          .in('status', ['active', 'responded']), 3, 300)
      ]);

      let activeResponders = 0;
      let committedResponders = 0;
      let alertCommitments: Record<string, number> = {};
      let hasError = false;
      let errorMessage = '';

      // Process responders result - now checking for online responders
      if (respondersResult.status === 'fulfilled' && !respondersResult.value.error) {
        // Instead of counting all responders, we now look for responders seen in the last 5 minutes
        const profiles = respondersResult.value.data || [];
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
        
        // Count responders who have been online in the last 5 minutes
        activeResponders = profiles.filter((profile: any) => {
          return profile.is_responder && profile.last_seen_at && 
                 new Date(profile.last_seen_at) >= fiveMinutesAgo;
        }).length;
        
        console.log('📊 [useRealTimeStats] Online responders:', activeResponders);
      } else {
        hasError = true;
        errorMessage = respondersResult.status === 'rejected'
          ? respondersResult.reason?.message || 'Network error'
          : respondersResult.value.error?.message || 'Failed to fetch responders';
        console.error('❌ [useRealTimeStats] Responders fetch failed:', errorMessage);
      }

      // Process responses result
      if (responsesResult.status === 'fulfilled' && !responsesResult.value.error) {
        const responses = responsesResult.value.data || [];
        committedResponders = responses.length;
        
        // Count commitments per alert
        responses.forEach(response => {
          if (response.alert_id) {
            alertCommitments[response.alert_id] = (alertCommitments[response.alert_id] || 0) + 1;
          }
        });
        
        console.log('📊 [useRealTimeStats] Committed responders:', committedResponders);
        console.log('📊 [useRealTimeStats] Alert commitments:', alertCommitments);
      } else if (!hasError) {
        hasError = true;
        errorMessage = responsesResult.status === 'rejected'
          ? responsesResult.reason?.message || 'Network error'
          : responsesResult.value.error?.message || 'Failed to fetch responses';
        console.error('❌ [useRealTimeStats] Responses fetch failed:', errorMessage);
      }

      // Process alerts result (for additional validation)
      if (alertsResult.status === 'fulfilled' && !alertsResult.value.error) {
        const alerts = alertsResult.value.data || [];
        // Use database responder_count as fallback if our calculation is missing
        alerts.forEach(alert => {
          if (!(alert.id in alertCommitments)) {
            alertCommitments[alert.id] = alert.responder_count || 0;
          }
        });
        console.log('📊 [useRealTimeStats] Final alert commitments:', alertCommitments);
      }

      if (!isMountedRef.current) {
        console.log('🛑 [useRealTimeStats] Component unmounted during fetch, aborting state update');
        return;
      }

      console.log('✅ [useRealTimeStats] About to update stats state:', {
        activeResponders,
        committedResponders,
        alertCommitments
      });

      setStats({
        activeResponders,
        committedResponders,
        alertCommitments,
      });

      if (hasError) {
        setError(errorMessage);
        setConnectionStatus('disconnected');
      } else {
        setConnectionStatus('connected');
      }

    } catch (error) {
      console.error('❌ [useRealTimeStats] Failed to fetch real-time stats:', error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setConnectionStatus('disconnected');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 [useRealTimeStats] Cleaning up real-time subscriptions and intervals');
    
    // Unsubscribe from all channels
    subscriptionsRef.current.forEach(subscription => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error('❌ [useRealTimeStats] Error unsubscribing:', error);
      }
    });
    subscriptionsRef.current = [];

    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial fetch
    fetchStats();

    // Set up real-time subscriptions with better error handling and unique channel names
    console.log('🔌 [useRealTimeStats] Setting up real-time subscriptions...');
    
    const alertsSubscription = supabase
      .channel(`alerts-stats-changes-${Date.now()}-${Math.random()}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'alerts' }, 
        (payload) => {
          console.log('🚨 [useRealTimeStats] Alert change detected:', {
            eventType: payload.eventType,
            alertId: payload.new?.id || payload.old?.id,
            newStatus: payload.new?.status,
            newResponderCount: payload.new?.responder_count,
            timestamp: new Date().toISOString()
          });
          
          // Immediate refresh with multiple attempts to handle timing issues
          if (isMountedRef.current) {
            setConnectionStatus('reconnecting');
            
            // Immediate fetch
            fetchStats();
            
            // Additional fetches with delays to catch database consistency issues
            setTimeout(() => {
              if (isMountedRef.current) {
                console.log('🔄 [useRealTimeStats] Secondary stats fetch after 300ms');
                fetchStats();
              }
            }, 300);
            
            setTimeout(() => {
              if (isMountedRef.current) {
                console.log('🔄 [useRealTimeStats] Tertiary stats fetch after 800ms');
                fetchStats();
              }
            }, 800);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [useRealTimeStats] Alerts subscription status:', status);
        if (!isMountedRef.current) return;
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [useRealTimeStats] Connected to alerts real-time updates');
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.log('❌ [useRealTimeStats] Alerts subscription failed');
          setConnectionStatus('disconnected');
        }
      });

    const responsesSubscription = supabase
      .channel(`responses-stats-changes-${Date.now()}-${Math.random()}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'responses' }, 
        (payload) => {
          console.log('👥 [useRealTimeStats] Response change detected:', {
            eventType: payload.eventType,
            responseId: payload.new?.id || payload.old?.id,
            alertId: payload.new?.alert_id || payload.old?.alert_id,
            responderId: payload.new?.responder_id || payload.old?.responder_id,
            status: payload.new?.status,
            timestamp: new Date().toISOString()
          });
          
          // Immediate refresh with multiple attempts to handle timing issues
          if (isMountedRef.current) {
            setConnectionStatus('reconnecting');
            
            // Immediate fetch
            fetchStats();
            
            // Additional fetches with delays to catch database consistency issues
            setTimeout(() => {
              if (isMountedRef.current) {
                console.log('🔄 [useRealTimeStats] Secondary stats fetch after 300ms');
                fetchStats();
              }
            }, 300);
            
            setTimeout(() => {
              if (isMountedRef.current) {
                console.log('🔄 [useRealTimeStats] Tertiary stats fetch after 800ms');
                fetchStats();
              }
            }, 800);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [useRealTimeStats] Responses subscription status:', status);
        if (!isMountedRef.current) return;
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [useRealTimeStats] Connected to responses real-time updates');
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.log('❌ [useRealTimeStats] Responses subscription failed');
          setConnectionStatus('disconnected');
        }
      });

    // Store subscriptions for cleanup
    subscriptionsRef.current = [alertsSubscription, responsesSubscription];

    // Set up fallback refresh every 5 seconds (more frequent for better responsiveness)
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        console.log('⏰ [useRealTimeStats] Periodic stats refresh (fallback)');
        fetchStats();
      }
    }, 5000);

    // Cleanup on unmount
    return () => {
      console.log('🧹 [useRealTimeStats] Component unmounting, setting isMountedRef to false');
      isMountedRef.current = false;
      cleanup();
    };
  }, [fetchStats, cleanup]);

  // Manual refresh function
  const refetch = useCallback(async () => {
    console.log('🔄 [useRealTimeStats] Manual refresh triggered');
    setConnectionStatus('reconnecting');
    await fetchStats();
  }, [fetchStats]);

  return { 
    stats, 
    loading, 
    error, 
    connectionStatus, 
    refetch 
  };
}