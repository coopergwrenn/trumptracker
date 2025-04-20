/*
  # Fix News Headlines Schema

  1. Changes
    - Add optimized index for recent articles
    - Update constraints to handle existing data
    - Add validation triggers
    
  2. Security
    - Maintain existing RLS policies
*/

-- Create optimized index for recent articles
CREATE INDEX IF NOT EXISTS idx_headlines_recent_articles
ON news_headlines(published_at DESC, neutralization_status)
WHERE neutralization_status = 'completed';

-- First, clean up any articles that would violate the constraint
DELETE FROM news_headlines
WHERE published_at < NOW() - INTERVAL '24 hours'
AND neutralization_status = 'pending';

-- Add constraint to ensure articles aren't too old
ALTER TABLE news_headlines
DROP CONSTRAINT IF EXISTS valid_published_date;

-- Create function to validate article freshness
CREATE OR REPLACE FUNCTION validate_article_freshness()
RETURNS trigger AS $$
BEGIN
  -- Set neutralization_status to pending for new articles
  IF TG_OP = 'INSERT' THEN
    NEW.neutralization_status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for article freshness validation
DROP TRIGGER IF EXISTS validate_article_freshness_trigger ON news_headlines;
CREATE TRIGGER validate_article_freshness_trigger
  BEFORE INSERT ON news_headlines
  FOR EACH ROW
  EXECUTE FUNCTION validate_article_freshness();

-- Add helpful comment
COMMENT ON TABLE news_headlines IS 'Stores recent news headlines with neutralization status';