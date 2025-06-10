/*
  # Fix Duplicate Response Records

  1. Database Schema
    - Add unique constraint on (alert_id, responder_id) to prevent duplicates
    - Clean up any existing duplicate records

  2. Security
    - Maintain existing RLS policies
*/

-- First, let's clean up any existing duplicate records
-- Keep only the most recent response for each alert_id + responder_id combination
WITH ranked_responses AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY alert_id, responder_id 
           ORDER BY created_at DESC
         ) as rn
  FROM responses
),
duplicates_to_delete AS (
  SELECT id 
  FROM ranked_responses 
  WHERE rn > 1
)
DELETE FROM responses 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Add unique constraint to prevent future duplicates
ALTER TABLE responses 
ADD CONSTRAINT responses_alert_responder_unique 
UNIQUE (alert_id, responder_id);

-- Create index for better performance on the unique constraint
CREATE INDEX IF NOT EXISTS idx_responses_alert_responder 
ON responses (alert_id, responder_id);