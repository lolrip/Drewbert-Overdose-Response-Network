import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-application-name': 'overdose-response-app',
    },
  },
});

// Helper function to check Supabase connection
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return false;
  }
};

// Helper function for retrying failed requests
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Wait before retrying, with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
};

// Update last_seen timestamp for a user (used to track online responders)
export const updateUserLastSeen = async (): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date().toISOString();
    
    await supabase
      .from('profiles')
      .update({ last_seen_at: now })
      .eq('id', user.id);
      
    console.log('✅ Updated user last_seen_at timestamp');
  } catch (error) {
    console.error('❌ Failed to update last_seen timestamp:', error);
  }
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          is_responder: boolean | null;
          anonymous_id: string | null;
          created_at: string | null;
          updated_at: string | null;
          is_admin: boolean | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          is_responder?: boolean | null;
          anonymous_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          is_admin?: boolean | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          is_responder?: boolean | null;
          anonymous_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          is_admin?: boolean | null;
        };
      };
      alerts: {
        Row: {
          id: string;
          session_id: string | null;
          user_id: string | null;
          anonymous_id: string | null;
          status: 'active' | 'responded' | 'resolved' | 'false_alarm';
          general_location: string;
          precise_location: string;
          responder_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          anonymous_id?: string | null;
          status?: 'active' | 'responded' | 'resolved' | 'false_alarm';
          general_location: string;
          precise_location: string;
          responder_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
          anonymous_id?: string | null;
          status?: 'active' | 'responded' | 'resolved' | 'false_alarm';
          general_location?: string;
          precise_location?: string;
          responder_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      responses: {
        Row: {
          id: string;
          alert_id: string;
          responder_id: string;
          status: 'committed' | 'en_route' | 'arrived' | 'completed';
          created_at: string;
          updated_at: string;
          ambulance_called: boolean;
          person_okay: boolean;
          naloxone_used: boolean;
          additional_notes: string;
        };
        Insert: {
          id?: string;
          alert_id: string;
          responder_id: string;
          status?: 'committed' | 'en_route' | 'arrived' | 'completed';
          created_at?: string;
          updated_at?: string;
          ambulance_called?: boolean;
          person_okay?: boolean;
          naloxone_used?: boolean;
          additional_notes?: string;
        };
        Update: {
          id?: string;
          alert_id?: string;
          responder_id?: string;
          status?: 'committed' | 'en_route' | 'arrived' | 'completed';
          created_at?: string;
          updated_at?: string;
          ambulance_called?: boolean;
          person_okay?: boolean;
          naloxone_used?: boolean;
          additional_notes?: string;
        };
      };
      monitoring_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          anonymous_id: string | null;
          status: 'active' | 'completed' | 'emergency';
          location_general: string | null;
          location_precise: string | null;
          check_ins_count: number;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          anonymous_id?: string | null;
          status?: 'active' | 'completed' | 'emergency';
          location_general?: string | null;
          location_precise?: string | null;
          check_ins_count?: number;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          anonymous_id?: string | null;
          status?: 'active' | 'completed' | 'emergency';
          location_general?: string | null;
          location_precise?: string | null;
          check_ins_count?: number;
          started_at?: string;
          ended_at?: string | null;
        };
      };
    };
  };
};