/*
  # Add response details columns to responses table

  1. Changes
    - Add columns to store response details like ambulance called, person status, etc.
    - Add columns for naloxone usage and additional notes
    - These will be populated when a responder ends their response

  2. New Columns
    - `ambulance_called` (boolean) - Whether an ambulance was called
    - `person_okay` (boolean) - Whether the person was responsive/okay
    - `naloxone_used` (boolean) - Whether naloxone (Narcan) was used
    - `additional_notes` (text) - Any additional notes about the response
*/

-- Add response detail columns to responses table
ALTER TABLE responses 
ADD COLUMN IF NOT EXISTS ambulance_called boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS person_okay boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS naloxone_used boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS additional_notes text DEFAULT '';