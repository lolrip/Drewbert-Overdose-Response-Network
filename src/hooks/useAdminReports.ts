import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface AdminStats {
  totalAlerts: number;
  alertsToday: number;
  totalResponses: number;
  responsesToday: number;
  naloxoneUsed: number;
  ambulancesCalled: number;
  successfulResponses: number;
  averageResponseTime: number;
  alertsByStatus: {
    active: number;
    responded: number;
    resolved: number;
    false_alarm: number;
  };
  monthlyTrends: {
    month: string;
    alerts: number;
    responses: number;
  }[];
}

export function useAdminReports() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return false;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Admin check error:', error);
        throw error;
      }

      const adminStatus = data?.is_admin || false;
      console.log('🔐 Admin status:', adminStatus);
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (err) {
      console.error('❌ Failed to check admin status:', err);
      setIsAdmin(false);
      return false;
    }
  }, []);

  const fetchAdminStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const isUserAdmin = await checkAdminStatus();
      if (!isUserAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      console.log('🔍 Starting admin stats fetch...');

      // Get current date boundaries
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      console.log('📅 Today boundary:', todayISO);

      // Try a simple test query first to check RLS
      console.log('🔍 Testing basic table access...');
      
      const { data: testAlerts, error: testAlertsError } = await supabase
        .from('alerts')
        .select('id')
        .limit(1);
      
      console.log('🔍 Test alerts query result:', { data: testAlerts, error: testAlertsError });

      const { data: testResponses, error: testResponsesError } = await supabase
        .from('responses')
        .select('id')
        .limit(1);
      
      console.log('🔍 Test responses query result:', { data: testResponses, error: testResponsesError });

      // If we can't access the tables, show helpful error
      if (testAlertsError || testResponsesError) {
        console.error('❌ Table access blocked by RLS policies');
        throw new Error('Database access restricted. Admin RLS policies may need to be configured.');
      }

      // Fetch total alerts
      console.log('📊 Fetching total alerts...');
      const { count: totalAlerts, error: alertsError } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true });

      if (alertsError) {
        console.error('❌ Error fetching total alerts:', alertsError);
      }
      console.log('📊 Total alerts:', totalAlerts);

      // Fetch alerts today
      console.log('📊 Fetching alerts today...');
      const { count: alertsToday, error: alertsTodayError } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO);

      if (alertsTodayError) {
        console.error('❌ Error fetching alerts today:', alertsTodayError);
      }
      console.log('📊 Alerts today:', alertsToday);

      // Fetch total responses
      console.log('📊 Fetching total responses...');
      const { count: totalResponses, error: responsesError } = await supabase
        .from('responses')
        .select('*', { count: 'exact', head: true });

      if (responsesError) {
        console.error('❌ Error fetching total responses:', responsesError);
      }
      console.log('📊 Total responses:', totalResponses);

      // Fetch responses today
      console.log('📊 Fetching responses today...');
      const { count: responsesToday, error: responsesTodayError } = await supabase
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO);

      if (responsesTodayError) {
        console.error('❌ Error fetching responses today:', responsesTodayError);
      }
      console.log('📊 Responses today:', responsesToday);

      // Fetch naloxone usage - check actual data
      console.log('📊 Fetching naloxone usage...');
      const { data: naloxoneData, count: naloxoneUsed, error: naloxoneError } = await supabase
        .from('responses')
        .select('naloxone_used', { count: 'exact' })
        .eq('naloxone_used', true);

      if (naloxoneError) {
        console.error('❌ Error fetching naloxone usage:', naloxoneError);
      }
      console.log('📊 Naloxone data:', naloxoneData);
      console.log('📊 Naloxone used count:', naloxoneUsed);

      // Fetch ambulance calls - check actual data
      console.log('📊 Fetching ambulance calls...');
      const { data: ambulanceData, count: ambulancesCalled, error: ambulanceError } = await supabase
        .from('responses')
        .select('ambulance_called', { count: 'exact' })
        .eq('ambulance_called', true);

      if (ambulanceError) {
        console.error('❌ Error fetching ambulance calls:', ambulanceError);
      }
      console.log('📊 Ambulance data:', ambulanceData);
      console.log('📊 Ambulances called count:', ambulancesCalled);

      // Fetch successful responses - check actual data
      console.log('📊 Fetching successful responses...');
      const { data: successData, count: successfulResponses, error: successError } = await supabase
        .from('responses')
        .select('person_okay', { count: 'exact' })
        .eq('person_okay', true);

      if (successError) {
        console.error('❌ Error fetching successful responses:', successError);
      }
      console.log('📊 Success data:', successData);
      console.log('📊 Successful responses count:', successfulResponses);

      // Fetch alerts by status - get all alerts to count status
      console.log('📊 Fetching alert status breakdown...');
      const { data: alertStatusData, error: statusError } = await supabase
        .from('alerts')
        .select('status');

      if (statusError) {
        console.error('❌ Error fetching alert status data:', statusError);
      }
      console.log('📊 Alert status data:', alertStatusData);

      const alertsByStatus = {
        active: 0,
        responded: 0,
        resolved: 0,
        false_alarm: 0,
      };

      if (alertStatusData) {
        alertStatusData.forEach((alert) => {
          if (alert.status && alert.status in alertsByStatus) {
            alertsByStatus[alert.status as keyof typeof alertsByStatus]++;
          }
        });
      }

      console.log('📊 Alerts by status:', alertsByStatus);

      // Calculate average response time (placeholder for now)
      const averageResponseTime = 4.2;

      // Generate monthly trends
      console.log('📊 Generating monthly trends...');
      const monthlyTrends = await generateMonthlyTrends();

      const finalStats = {
        totalAlerts: totalAlerts || 0,
        alertsToday: alertsToday || 0,
        totalResponses: totalResponses || 0,
        responsesToday: responsesToday || 0,
        naloxoneUsed: naloxoneUsed || 0,
        ambulancesCalled: ambulancesCalled || 0,
        successfulResponses: successfulResponses || 0,
        averageResponseTime,
        alertsByStatus,
        monthlyTrends,
      };

      console.log('📊 Final stats:', finalStats);
      setStats(finalStats);

      // If we still have all zeros but no errors, likely an RLS issue
      if (finalStats.totalAlerts === 0 && finalStats.totalResponses === 0) {
        console.warn('⚠️ All stats are zero - this may indicate RLS policy restrictions');
        setError('Data appears to be restricted. Please ensure admin RLS policies are configured correctly.');
      }

    } catch (err) {
      console.error('❌ Failed to fetch admin stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch admin statistics');
      
      // Set fallback stats for development/testing
      setStats({
        totalAlerts: 0,
        alertsToday: 0,
        totalResponses: 0,
        responsesToday: 0,
        naloxoneUsed: 0,
        ambulancesCalled: 0,
        successfulResponses: 0,
        averageResponseTime: 0,
        alertsByStatus: {
          active: 0,
          responded: 0,
          resolved: 0,
          false_alarm: 0,
        },
        monthlyTrends: [],
      });
    } finally {
      setLoading(false);
    }
  }, [checkAdminStatus]);

  const generateMonthlyTrends = async () => {
    const trends = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      try {
        const { count: alerts, error: alertsError } = await supabase
          .from('alerts')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', date.toISOString())
          .lt('created_at', nextMonth.toISOString());

        if (alertsError) {
          console.error(`❌ Error fetching alerts for ${monthName}:`, alertsError);
        }

        const { count: responses, error: responsesError } = await supabase
          .from('responses')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', date.toISOString())
          .lt('created_at', nextMonth.toISOString());

        if (responsesError) {
          console.error(`❌ Error fetching responses for ${monthName}:`, responsesError);
        }

        trends.push({
          month: monthName,
          alerts: alerts || 0,
          responses: responses || 0,
        });
      } catch (error) {
        console.error(`❌ Failed to fetch data for ${monthName}:`, error);
        trends.push({
          month: monthName,
          alerts: 0,
          responses: 0,
        });
      }
    }

    return trends;
  };

  useEffect(() => {
    fetchAdminStats();
  }, [fetchAdminStats]);

  return {
    stats,
    loading,
    error,
    isAdmin,
    refetch: fetchAdminStats,
  };
}