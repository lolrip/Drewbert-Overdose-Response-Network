import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, Lock, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: any;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function AuthWrapper({ children, requireAuth = false }: AuthWrapperProps) {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
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
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      setShowAuth(false);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary-600 rounded-xl animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600 font-manrope">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-primary-100 p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold font-space text-gray-900 mb-2">
              Responder Access
            </h2>
            <p className="text-gray-600 font-manrope">
              Sign in to access the responder dashboard
            </p>
          </div>

          {/* Demo Credentials Notice */}
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold font-space text-accent-900 mb-2">Demo Accounts</h3>
            <p className="text-sm text-accent-800 font-manrope mb-3">
              Use these test credentials to explore the system:
            </p>
            <div className="space-y-2 text-sm font-mono">
              <div className="bg-white rounded p-2 border border-accent-200">
                <div className="text-coral-600 font-semibold">Admin Account:</div>
                <div>admin@drewbertdemo.online</div>
                <div>Password: admin</div>
              </div>
              <div className="bg-white rounded p-2 border border-accent-200">
                <div className="text-primary-600 font-semibold">Responder Account:</div>
                <div>responder@drewbertdemo.online</div>
                <div>Password: responder</div>
              </div>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-sm font-medium font-space text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-manrope focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium font-space text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg font-manrope focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {error && (
              <div className="bg-coral-50 border border-coral-200 rounded-lg p-3">
                <p className="text-coral-800 text-sm font-manrope">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold font-space py-3 px-6 rounded-lg transition-colors"
            >
              <div className="flex items-center justify-center gap-2">
                {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-primary-600 hover:text-primary-700 font-manrope text-sm"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading }}>
      <div>
        {user && (
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-primary-600" />
                <span className="text-sm font-manrope text-gray-700">{user.email}</span>
                {isAdmin && (
                  <span className="text-xs bg-coral-100 text-coral-800 px-2 py-1 rounded-full font-manrope font-medium">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700 font-manrope"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </AuthContext.Provider>
  );
}