/*
  # Create monitoring and alert tables

  1. New Tables
    - `monitoring_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `anonymous_id` (text, for non-authenticated users)
      - `status` (enum: active, completed, emergency)
      - `location_general` (text)
      - `location_precise` (text)
      - `check_ins_count` (integer)
      - `started_at` (timestamp)
      - `ended_at` (timestamp)
    - `alerts`
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to monitoring_sessions)
      - `user_id` (uuid, foreign key to profiles)
      - `anonymous_id` (text, for non-authenticated users)
      - `status` (enum: active, responded, resolved, false_alarm)
      - `general_location` (text)
      - `precise_location` (text)
      - `responder_count` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `responses`
      - `id` (uuid, primary key)
      - `alert_id` (uuid, foreign key to alerts)
      - `responder_id` (uuid, foreign key to profiles)
      - `status` (enum: committed, en_route, arrived, completed)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users and responders
*/

-- Create enum types
CREATE TYPE monitoring_status AS ENUM ('active', 'completed', 'emergency');
CREATE TYPE alert_status AS ENUM ('active', 'responded', 'resolved', 'false_alarm');
CREATE TYPE response_status AS ENUM ('committed', 'en_route', 'arrived', 'completed');

-- Create monitoring_sessions table
CREATE TABLE IF NOT EXISTS monitoring_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  anonymous_id text,
  status monitoring_status DEFAULT 'active',
  location_general text,
  location_precise text,
  check_ins_count integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES monitoring_sessions(id),
  user_id uuid REFERENCES profiles(id),
  anonymous_id text,
  status alert_status DEFAULT 'active',
  general_location text NOT NULL,
  precise_location text NOT NULL,
  responder_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES alerts(id) NOT NULL,
  responder_id uuid REFERENCES profiles(id) NOT NULL,
  status response_status DEFAULT 'committed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE monitoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Policies for monitoring_sessions
CREATE POLICY "Users can view own sessions"
  ON monitoring_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON monitoring_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON monitoring_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for alerts
CREATE POLICY "Responders can view all alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_responder = true
    )
  );

CREATE POLICY "Users can insert own alerts"
  ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for responses
CREATE POLICY "Responders can manage responses"
  ON responses
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = responder_id OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_responder = true
    )
  );

-- Add updated_at trigger for alerts
CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for responses
CREATE TRIGGER update_responses_updated_at
  BEFORE UPDATE ON responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_user_id ON monitoring_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_sessions_anonymous_id ON monitoring_sessions(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_alert_id ON responses(alert_id);
CREATE INDEX IF NOT EXISTS idx_responses_responder_id ON responses(responder_id);