import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Shield, Phone, ExternalLink, Save, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { useAuth } from './AuthWrapper';
import { supabase } from '../lib/supabase';

interface ResponderProfileProps {
  onBack: () => void;
  onViewAdminDashboard: () => void;
}

interface ProfileData {
  email: string;
  isResponder: boolean;
  createdAt: string;
}

export function ResponderProfile({ onBack, onViewAdminDashboard }: ResponderProfileProps) {
  const { isAdmin } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfileData({
        email: user.email || '',
        isResponder: data?.is_responder || false,
        createdAt: data?.created_at || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAccountType = () => {
    if (isAdmin) {
      return 'System Administrator';
    } else if (profileData?.isResponder) {
      return 'Authorized Responder';
    } else {
      return 'Regular User';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-600 rounded-xl animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600 font-manrope">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold font-space text-gray-900">
                Responder Profile
              </h1>
              <p className="text-sm text-gray-600 font-manrope">
                Manage your account settings and resources
              </p>
            </div>
            
            {/* Admin Dashboard Button - PROMINENTLY DISPLAYED */}
            {isAdmin && (
              <button
                onClick={onViewAdminDashboard}
                className="flex items-center gap-2 px-6 py-3 bg-coral-600 hover:bg-coral-700 text-white rounded-xl transition-colors shadow-lg animate-pulse-slow"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="font-semibold font-space">Admin Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Admin Notice */}
      {isAdmin && (
        <div className="mx-6 mt-4 bg-coral-50 border-2 border-coral-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-coral-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-coral-600" />
            </div>
            <div>
              <h3 className="font-bold font-space text-coral-900">Administrator Access</h3>
              <p className="text-sm text-coral-800 font-manrope">
                You have admin privileges. Click "Admin Dashboard" above to access system reports and analytics.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Messages */}
          {message && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
              <p className="text-primary-800 text-sm font-manrope">{message}</p>
            </div>
          )}

          {error && (
            <div className="bg-coral-50 border border-coral-200 rounded-lg p-3">
              <p className="text-coral-800 text-sm font-manrope">{error}</p>
            </div>
          )}

          {/* Profile Information */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 ${isAdmin ? 'bg-coral-100' : 'bg-primary-100'} rounded-full flex items-center justify-center`}>
                <User className={`w-8 h-8 ${isAdmin ? 'text-coral-600' : 'text-primary-600'}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold font-space text-gray-900">
                  Account Information
                </h2>
                <p className="text-sm text-gray-600 font-manrope">
                  Your responder account details
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium font-space text-gray-900">Email</p>
                  <p className="text-sm text-gray-600 font-manrope">{profileData?.email}</p>
                </div>
              </div>

              <div className={`flex items-center gap-3 p-3 ${isAdmin ? 'bg-coral-50' : 'bg-primary-50'} rounded-lg`}>
                <Shield className={`w-5 h-5 ${isAdmin ? 'text-coral-600' : 'text-primary-600'}`} />
                <div>
                  <p className={`text-sm font-medium font-space ${isAdmin ? 'text-coral-900' : 'text-primary-900'}`}>Account Type</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${isAdmin ? 'text-coral-700' : 'text-primary-700'} font-manrope font-semibold`}>
                      {getAccountType()}
                    </p>
                    {isAdmin && (
                      <span className="text-xs bg-coral-200 text-coral-900 px-2 py-1 rounded-full font-manrope font-bold">
                        ADMIN
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {profileData?.createdAt && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium font-space text-gray-900">Member Since</p>
                    <p className="text-sm text-gray-600 font-manrope">
                      {formatDate(profileData.createdAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold font-space text-gray-900 mb-4">
              Security Settings
            </h2>

            {!showPasswordChange ? (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full p-4 border border-gray-300 hover:bg-gray-50 rounded-lg text-left transition-colors"
              >
                <p className="font-medium font-space text-gray-900">Change Password</p>
                <p className="text-sm text-gray-600 font-manrope">
                  Update your account password
                </p>
              </button>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium font-space text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg font-manrope focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium font-space text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-manrope focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      setError('');
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-manrope rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold font-space py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Emergency Resources */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold font-space text-gray-900 mb-4">
              Emergency Resources
            </h2>
            <p className="text-sm text-gray-600 font-manrope mb-6">
              Quick access to important contacts and resources for responders
            </p>

            <div className="space-y-4">
              {/* Emergency Contacts */}
              <div className="grid gap-3">
                <a
                  href="tel:911"
                  className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-semibold font-space text-red-900">Emergency Services</p>
                      <p className="text-sm text-red-700 font-manrope">911</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-red-600" />
                </a>

                <a
                  href="tel:18002221222"
                  className="flex items-center justify-between p-4 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary-600" />
                    <div>
                      <p className="font-semibold font-space text-primary-900">Poison Control</p>
                      <p className="text-sm text-primary-700 font-manrope">1-800-222-1222</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-primary-600" />
                </a>

                <a
                  href="sms:741741&body=HOME"
                  className="flex items-center justify-between p-4 bg-accent-50 border border-accent-200 rounded-lg hover:bg-accent-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-accent-600" />
                    <div>
                      <p className="font-semibold font-space text-accent-900">Crisis Text Line</p>
                      <p className="text-sm text-accent-700 font-manrope">Text HOME to 741741</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-accent-600" />
                </a>
              </div>

              {/* Resource Links */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-semibold font-space text-gray-900 mb-3">
                  Educational Resources
                </h3>
                <div className="space-y-2">
                  <a
                    href="https://www.samhsa.gov/medication-assisted-treatment/medications-counseling-related-conditions/naloxone"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-manrope text-gray-900">
                      Naloxone (Narcan) Information - SAMHSA
                    </p>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>

                  <a
                    href="https://www.cdc.gov/drugoverdose/prevention/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-manrope text-gray-900">
                      Overdose Prevention - CDC
                    </p>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>

                  <a
                    href="https://www.redcross.org/take-a-class/first-aid"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm font-manrope text-gray-900">
                      First Aid Training - Red Cross
                    </p>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* App Information */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-lg font-bold font-space text-gray-900 mb-4">
              About Drewbert
            </h2>
            <div className="space-y-3 text-sm text-gray-600 font-manrope">
              <p>
                Drewbert is a community-driven platform designed to help prevent overdose emergencies 
                through real-time monitoring and rapid response coordination.
              </p>
              <p>
                As a responder, you're part of a network of trained community members who help save lives 
                through quick, coordinated emergency response.
              </p>
              <p className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                Version 0.0.2 • © 2025 Drewbert Community Response
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}