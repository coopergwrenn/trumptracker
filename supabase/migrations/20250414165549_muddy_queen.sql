/*
  # Add neutralization tracking fields

  1. Changes
    - Add neutralization_status to track AI processing state
    - Add neutral_summary for storing comprehensive summaries
    - Add error_log for tracking processing failures
    
  2. Details
    - neutralization_status can be: pending, completed, or failed
    - neutral_summary stores the AI-generated comprehensive summary
    - error_log captures any errors during neutralization
*/

ALTER TABLE news_headlines
ADD COLUMN IF NOT EXISTS neutralization_status text CHECK (neutralization_status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS neutral_summary text,
ADD COLUMN IF NOT EXISTS error_log text;