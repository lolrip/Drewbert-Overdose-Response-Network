import { useState, useCallback, useEffect } from 'react';
import { supabase, withRetry } from '../lib/supabase';

interface LocationData {
  general: string;
  precise: string;
}

interface MonitoringSession {
  id: string;
  status: 'active' | 'completed' | 'emergency';
  location_general: string;
  location_precise: string;
  check_ins_count: number;
  started_at: string;
}

// Session storage keys
const SESSION_STORAGE_KEY = 'monitoring_session';
const ALERT_STORAGE_KEY = 'active_alert';

export function useMonitoringSession() {
  const [currentSession, setCurrentSession] = useState<MonitoringSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing session from sessionStorage on mount
  useEffect(() => {
    const savedSession = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        setCurrentSession(parsedSession);
        console.log('📱 Restored session from storage:', parsedSession.id);
      } catch (error) {
        console.error('❌ Failed to parse saved session:', error);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }, []);

  // Save session to sessionStorage whenever it changes
  useEffect(() => {
    if (currentSession) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentSession));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [currentSession]);

  const checkForExistingSession = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check for existing active session in database
      const { data: existingSessions, error } = await supabase
        .from('monitoring_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ Error checking for existing sessions:', error);
        return null;
      }

      if (existingSessions && existingSessions.length > 0) {
        const session = existingSessions[0];
        console.log('🔍 Found existing active session:', session.id);
        setCurrentSession(session);
        return session;
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to check for existing session:', error);
      return null;
    }
  }, []);

  const checkForExistingAlert = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check for existing active alert for this user
      const { data: existingAlerts, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'responded'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ Error checking for existing alerts:', error);
        return null;
      }

      if (existingAlerts && existingAlerts.length > 0) {
        const alert = existingAlerts[0];
        console.log('🚨 Found existing active alert:', alert.id);
        // Store alert ID in sessionStorage for reference
        sessionStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify({
          id: alert.id,
          created_at: alert.created_at,
          status: alert.status
        }));
        return alert;
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to check for existing alert:', error);
      return null;
    }
  }, []);

  const startSession = useCallback(async (locationData: LocationData) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🔍 Starting session for user:', user?.id ? 'authenticated' : 'anonymous');
      
      // First, check if there's an existing active session
      if (user?.id) {
        const existingSession = await checkForExistingSession();
        if (existingSession) {
          console.log('♻️ Using existing active session:', existingSession.id);
          setLoading(false);
          return existingSession;
        }
      }
      
      // Generate anonymous ID for anonymous users
      const anonymousId = user?.id ? null : crypto.randomUUID();

      // PROACTIVELY end any existing active sessions to prevent constraint violation
      console.log('🧹 Proactively ending any existing active sessions...');
      
      if (user?.id) {
        // End existing active sessions for authenticated user
        const { error: endUserError } = await supabase
          .from('monitoring_sessions')
          .update({ 
            status: 'completed',
            ended_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('status', 'active');
        
        if (endUserError) {
          console.error('❌ Error ending existing user sessions:', endUserError);
        } else {
          console.log('✅ Ended any existing user sessions');
        }
      } else if (anonymousId) {
        // For anonymous users, we need to check if there are any existing sessions
        // with the same anonymous_id (though this is less likely since we generate new UUIDs)
        // But we should still be safe about it
        console.log('🔍 Checking for existing anonymous sessions...');
      }

      // Wait a moment for database consistency
      await new Promise(resolve => setTimeout(resolve, 100));

      const sessionData = {
        user_id: user?.id || null,
        anonymous_id: anonymousId,
        status: 'active' as const,
        location_general: locationData.general,
        location_precise: locationData.precise,
        check_ins_count: 0,
      };

      console.log('📝 Creating new session:', sessionData);

      const { data, error } = await supabase
        .from('monitoring_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error('❌ Session creation failed:', error);
        
        // If we still get a duplicate key error despite our proactive cleanup,
        // it means there's a race condition or the cleanup didn't work
        if (error.code === '23505') {
          console.log('🔄 Still got duplicate error, attempting recovery...');
          
          // Try one more cleanup and retry
          if (user?.id) {
            await supabase
              .from('monitoring_sessions')
              .update({ 
                status: 'completed',
                ended_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .eq('status', 'active');
          }
          
          // Wait a bit longer
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Final retry
          const { data: retryData, error: retryError } = await supabase
            .from('monitoring_sessions')
            .insert(sessionData)
            .select()
            .single();
          
          if (retryError) {
            throw new Error(`Failed to create session after cleanup: ${retryError.message}`);
          }
          
          console.log('✅ Session created successfully after retry:', retryData);
          setCurrentSession(retryData);
          return retryData;
        } else {
          throw error;
        }
      }

      console.log('✅ Session created successfully:', data);
      setCurrentSession(data);
      return data;
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start session';
      console.error('💥 Session start failed:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCheckInCount = useCallback(async (sessionId: string, count: number) => {
    try {
      console.log('📊 Updating check-in count:', sessionId, count);
      const { error } = await supabase
        .from('monitoring_sessions')
        .update({ check_ins_count: count })
        .eq('id', sessionId);

      if (error) {
        console.error('❌ Error updating check-in count:', error);
        throw error;
      }

      setCurrentSession(prev => prev ? { ...prev, check_ins_count: count } : null);
      console.log('✅ Check-in count updated successfully');
    } catch (err) {
      console.error('❌ Failed to update check-in count:', err);
    }
  }, []);

  const updateSessionLocation = useCallback(async (sessionId: string, locationData: LocationData) => {
    try {
      console.log('📍 Updating session location:', sessionId, locationData);
      
      const result: any = await withRetry(() =>
        supabase
          .from('monitoring_sessions')
          .update({ 
            location_general: locationData.general,
            location_precise: locationData.precise
          })
          .eq('id', sessionId)
      );

      if (result.error) {
        console.error('❌ Error updating session location:', result.error);
        throw result.error;
      }

      setCurrentSession(prev => prev ? { 
        ...prev, 
        location_general: locationData.general,
        location_precise: locationData.precise
      } : null);
      
      console.log('✅ Session location updated successfully');
      return true;
    } catch (err) {
      console.error('❌ Failed to update session location:', err);
      throw err;
    }
  }, []);

  const endSession = useCallback(async (sessionId: string, status: 'completed' | 'emergency' = 'completed') => {
    try {
      console.log('🏁 Ending session:', sessionId, 'with status:', status);
      const { error } = await supabase.rpc('end_monitoring_session_safe', {
        p_session_id: sessionId,
        p_status: status
      });

      if (error) {
        console.error('❌ Error ending session:', error);
        throw error;
      }

      console.log('✅ Session ended successfully');
      setCurrentSession(null);
    } catch (err) {
      console.error('❌ Failed to end session:', err);
    }
  }, []);

  const createAlert = useCallback(async (sessionId: string | null, locationData: LocationData) => {
    const callId = Math.random().toString(36).substr(2, 9);
    try {
      console.log(`🚨 [createAlert-${callId}] Creating alert for session:`, sessionId);
      console.log(`🚨 [createAlert-${callId}] LocationData:`, locationData);
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log(`🚨 [createAlert-${callId}] User:`, user?.id || 'anonymous');
      
      const anonymousId = user?.id ? null : crypto.randomUUID();

      // Use the new optimized alert creation function
      console.log(`📝 [createAlert-${callId}] Using optimized alert creation function...`);
      const { data: alertId, error } = await supabase.rpc('create_alert_with_notification', {
        p_session_id: sessionId,
        p_user_id: user?.id || null,
        p_anonymous_id: anonymousId,
        p_general_location: locationData.general,
        p_precise_location: locationData.precise
      });

      if (error) {
        console.error(`❌ [createAlert-${callId}] Error creating alert with notification:`, error);
        
        // Fallback to regular insert if the function fails
        console.log(`🔄 [createAlert-${callId}] Falling back to regular alert creation...`);
        const alertData = {
          session_id: sessionId,
          user_id: user?.id || null,
          anonymous_id: anonymousId,
          status: 'active' as const,
          general_location: locationData.general,
          precise_location: locationData.precise,
          responder_count: 0,
        };

        const fallbackResult: any = await withRetry(() =>
          supabase
            .from('alerts')
            .insert(alertData)
            .select()
            .single()
        );

        if (fallbackResult.error) {
          console.error('❌ Fallback alert creation failed:', fallbackResult.error);
          throw fallbackResult.error;
        }

        console.log(`✅ [createAlert-${callId}] Alert created successfully (fallback):`, fallbackResult.data);

        // End the session with emergency status if sessionId provided
        if (sessionId) {
          await endSession(sessionId, 'emergency');
        }

        return fallbackResult.data;
      }

      console.log(`✅ [createAlert-${callId}] Alert created successfully with notification:`, alertId);

      // Get the full alert data
      const { data: alertData, error: fetchError } = await supabase
        .from('alerts')
        .select('*')
        .eq('id', alertId)
        .single();

      if (fetchError) {
        console.error(`❌ [createAlert-${callId}] Error fetching created alert:`, fetchError);
        throw fetchError;
      }

      // End the session with emergency status if sessionId provided
      if (sessionId) {
        await endSession(sessionId, 'emergency');
      }

      // Force a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log(`✅ [createAlert-${callId}] Returning alert data:`, alertData);
      return alertData;
    } catch (err) {
      console.error(`❌ [createAlert-${callId}] Failed to create alert:`, err);
      throw err;
    }
  }, [endSession]);

  const updateAlertLocation = useCallback(async (alertId: string, locationData: LocationData) => {
    try {
      console.log('📍 Updating alert location:', alertId, locationData);
      
      const result: any = await withRetry(() =>
        supabase
          .from('alerts')
          .update({ 
            general_location: locationData.general,
            precise_location: locationData.precise,
            updated_at: new Date().toISOString()
          })
          .eq('id', alertId)
      );

      if (result.error) {
        console.error('❌ Error updating alert location:', result.error);
        throw result.error;
      }

      console.log('✅ Alert location updated successfully');
      return true;
    } catch (err) {
      console.error('❌ Failed to update alert location:', err);
      throw err;
    }
  }, []);

  const cancelAlert = useCallback(async (alertId: string) => {
    try {
      console.log('🚫 Cancelling alert:', alertId);
      
      const { error } = await supabase
        .from('alerts')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) {
        console.error('❌ Error cancelling alert:', error);
        throw error;
      }

      console.log('✅ Alert cancelled successfully');
      // Clear from session storage
      sessionStorage.removeItem('active_alert');
      
      return true;
    } catch (err) {
      console.error('❌ Failed to cancel alert:', err);
      throw err;
    }
  }, [supabase]);

  return {
    currentSession,
    loading,
    error,
    startSession,
    updateCheckInCount,
    updateSessionLocation,
    endSession,
    createAlert,
    updateAlertLocation,
    cancelAlert,
  };
}