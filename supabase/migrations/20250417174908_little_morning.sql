/*
  # Fix news article constraints and triggers

  1. Changes
    - Remove overly restrictive date constraints
    - Update indexes for better performance
    - Modify triggers for article processing
    
  2. Details
    - Removes published_date constraint that was causing issues
    - Updates indexes for better query performance
    - Modifies triggers to handle article processing correctly
*/

-- Drop existing constraints that might be too restrictive
ALTER TABLE news_headlines
DROP CONSTRAINT IF EXISTS valid_published_date;

-- Create optimized index for recent articles
DROP INDEX IF EXISTS idx_headlines_recent_articles;
CREATE INDEX idx_headlines_recent_articles
ON news_headlines(published_at DESC, neutralization_status)
WHERE neutralization_status = 'completed';

-- Create index for source and date filtering
DROP INDEX IF EXISTS idx_headlines_source_date;
CREATE INDEX idx_headlines_source_date
ON news_headlines(source_name, published_at DESC);

-- Update the article freshness validation function
CREATE OR REPLACE FUNCTION validate_article_freshness()
RETURNS trigger AS $$
BEGIN
  -- Set neutralization_status to pending for new articles
  IF TG_OP = 'INSERT' THEN
    NEW.neutralization_status := COALESCE(NEW.neutralization_status, 'pending');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger for article freshness validation
DROP TRIGGER IF EXISTS validate_article_freshness_trigger ON news_headlines;
CREATE TRIGGER validate_article_freshness_trigger
  BEFORE INSERT ON news_headlines
  FOR EACH ROW
  EXECUTE FUNCTION validate_article_freshness();

-- Add helpful comment
COMMENT ON TABLE news_headlines IS 'Stores news headlines with optimized indexing for recent article retrieval';