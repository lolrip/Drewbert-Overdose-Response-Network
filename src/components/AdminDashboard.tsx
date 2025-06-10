import React from 'react';
import { ArrowLeft, BarChart3, Users, AlertTriangle, Activity, Download, Shield, Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { useAuth } from './AuthWrapper';
import { useAdminReports } from '../hooks/useAdminReports';
import { BoltBadge } from './BoltBadge';

interface AdminDashboardProps {
  onBack: () => void;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { isAdmin } = useAuth();
  const { stats, loading, error, refetch } = useAdminReports();

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-coral-200 p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-coral-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold font-space text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 font-manrope mb-6">
            You don't have administrator privileges to access this page.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold font-space rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleDownloadReport = () => {
    if (!stats) return;

    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalAlerts: stats.totalAlerts,
        totalResponses: stats.totalResponses,
        naloxoneUsed: stats.naloxoneUsed,
        ambulancesCalled: stats.ambulancesCalled,
        successfulResponses: stats.successfulResponses,
        averageResponseTime: stats.averageResponseTime,
      },
      alertsByStatus: stats.alertsByStatus,
      monthlyTrends: stats.monthlyTrends,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drewbert-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold font-space text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-600 font-manrope">
                  System analytics and reporting
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={refetch}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-manrope">Refresh</span>
              </button>
              <button
                onClick={handleDownloadReport}
                disabled={!stats}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-manrope">Export Report</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-6">
        <div className="max-w-6xl mx-auto">
          
          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-12 h-12 bg-primary-600 rounded-xl animate-pulse mx-auto mb-4"></div>
              <p className="text-gray-600 font-manrope">Loading admin data...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl shadow-lg border border-coral-200 p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-coral-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold font-space text-gray-900 mb-2">
                Error Loading Data
              </h3>
              <p className="text-gray-600 font-manrope mb-4">{error}</p>
              <button
                onClick={refetch}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold font-space rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              
              {/* Data Status Alert */}
              {stats.totalAlerts === 0 && stats.totalResponses === 0 && (
                <div className="bg-accent-50 border border-accent-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-accent-600" />
                    <div>
                      <h3 className="font-bold font-space text-accent-900">No Data Found</h3>
                      <p className="text-sm text-accent-800 font-manrope">
                        The system hasn't recorded any alerts or responses yet. Data will appear here once users start using the monitoring features.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-lg border border-primary-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-primary-600" />
                    </div>
                    <span className="text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full font-manrope">
                      Total
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold font-space text-gray-900 mb-1">
                    {stats.totalAlerts}
                  </h3>
                  <p className="text-sm text-gray-600 font-manrope">
                    Total Alerts
                  </p>
                  <p className="text-xs text-primary-600 font-manrope mt-2">
                    +{stats.alertsToday} today
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-accent-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-accent-600" />
                    </div>
                    <span className="text-xs bg-accent-100 text-accent-800 px-2 py-1 rounded-full font-manrope">
                      Total
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold font-space text-gray-900 mb-1">
                    {stats.totalResponses}
                  </h3>
                  <p className="text-sm text-gray-600 font-manrope">
                    Total Responses
                  </p>
                  <p className="text-xs text-accent-600 font-manrope mt-2">
                    +{stats.responsesToday} today
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-coral-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-coral-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-coral-600" />
                    </div>
                    <span className="text-xs bg-coral-100 text-coral-800 px-2 py-1 rounded-full font-manrope">
                      Lifesaving
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold font-space text-gray-900 mb-1">
                    {stats.naloxoneUsed}
                  </h3>
                  <p className="text-sm text-gray-600 font-manrope">
                    Naloxone Uses
                  </p>
                  <p className="text-xs text-coral-600 font-manrope mt-2">
                    Potential lives saved
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-gray-600" />
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full font-manrope">
                      Avg
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold font-space text-gray-900 mb-1">
                    {stats.averageResponseTime}m
                  </h3>
                  <p className="text-sm text-gray-600 font-manrope">
                    Response Time
                  </p>
                  <p className="text-xs text-gray-600 font-manrope mt-2">
                    Average to scene
                  </p>
                </div>
              </div>

              {/* Alert Status Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <BarChart3 className="w-5 h-5 text-primary-600" />
                    <h3 className="text-lg font-bold font-space text-gray-900">
                      Alert Status Breakdown
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-coral-50 rounded-lg">
                      <span className="text-sm font-medium font-space text-coral-900">Active Alerts</span>
                      <span className="text-lg font-bold font-space text-coral-900">
                        {stats.alertsByStatus.active}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-accent-50 rounded-lg">
                      <span className="text-sm font-medium font-space text-accent-900">Responded</span>
                      <span className="text-lg font-bold font-space text-accent-900">
                        {stats.alertsByStatus.responded}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                      <span className="text-sm font-medium font-space text-primary-900">Resolved</span>
                      <span className="text-lg font-bold font-space text-primary-900">
                        {stats.alertsByStatus.resolved}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium font-space text-gray-900">False Alarms</span>
                      <span className="text-lg font-bold font-space text-gray-900">
                        {stats.alertsByStatus.false_alarm}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Activity className="w-5 h-5 text-coral-600" />
                    <h3 className="text-lg font-bold font-space text-gray-900">
                      Emergency Interventions
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-coral-50 rounded-lg">
                      <span className="text-sm font-medium font-space text-coral-900">Ambulances Called</span>
                      <span className="text-lg font-bold font-space text-coral-900">
                        {stats.ambulancesCalled}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                      <span className="text-sm font-medium font-space text-primary-900">Successful Responses</span>
                      <span className="text-lg font-bold font-space text-primary-900">
                        {stats.successfulResponses}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold font-space text-gray-900 mb-1">
                          {stats.totalResponses > 0 
                            ? Math.round((stats.successfulResponses / stats.totalResponses) * 100)
                            : 0}%
                        </div>
                        <p className="text-sm text-gray-600 font-manrope">Success Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Trends */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-5 h-5 text-accent-600" />
                  <h3 className="text-lg font-bold font-space text-gray-900">
                    6-Month Trends
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {stats.monthlyTrends.map((trend, index) => (
                    <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-1 justify-center mb-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <h4 className="text-sm font-semibold font-space text-gray-900">
                          {trend.month}
                        </h4>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-lg font-bold font-space text-coral-900">
                            {trend.alerts}
                          </div>
                          <p className="text-xs text-gray-600 font-manrope">Alerts</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold font-space text-primary-900">
                            {trend.responses}
                          </div>
                          <p className="text-xs text-gray-600 font-manrope">Responses</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Info */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-bold font-space text-gray-900 mb-4">
                  Report Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 font-manrope">
                  <div>
                    <span className="font-medium">Generated:</span> {new Date().toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">System:</span> Drewbert Community Response v1.0.0
                  </div>
                  <div>
                    <span className="font-medium">Data Range:</span> All time to present
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span> Live data
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Built with Bolt Badge */}
      <BoltBadge position="top-right" />
    </div>
  );
}