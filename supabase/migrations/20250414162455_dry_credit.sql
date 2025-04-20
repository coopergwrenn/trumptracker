/*
  # Add neutralization status and summary fields

  1. Changes
    - Add neutralization_status to track AI processing state
    - Add neutral_summary for detailed bullet-point summaries
    - Add error_log for tracking AI processing issues
    
  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE news_headlines
ADD COLUMN IF NOT EXISTS neutralization_status text CHECK (neutralization_status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS neutral_summary text,
ADD COLUMN IF NOT EXISTS error_log text;