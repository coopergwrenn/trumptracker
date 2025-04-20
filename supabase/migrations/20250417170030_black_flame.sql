/*
  # Optimize news fetching

  1. Changes
    - Add composite index for efficient date-based queries
    - Add check constraint for published_at to ensure valid dates
    - Update existing indexes for better performance
    - Add function to validate article freshness

  2. Performance
    - Optimize query performance for recent articles
    - Ensure proper date handling across time zones
    - Prevent stale article insertion
*/

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_news_headlines_published_at;
DROP INDEX IF EXISTS idx_headlines_status_date;

-- Create optimized composite indexes for fetching recent articles
CREATE INDEX IF NOT EXISTS idx_headlines_recent_articles
ON news_headlines(published_at DESC, neutralization_status)
WHERE neutralization_status = 'completed';

-- Add constraint to ensure published_at is not in the future
ALTER TABLE news_headlines
ADD CONSTRAINT valid_published_date
CHECK (published_at <= NOW() + interval '1 hour'); -- Allow small buffer for time zone differences

-- Create function to validate article freshness
CREATE OR REPLACE FUNCTION validate_article_freshness()
RETURNS trigger AS $$
BEGIN
  -- Ensure articles aren't too old when inserted
  IF NEW.published_at < NOW() - interval '7 days' THEN
    RAISE EXCEPTION 'Article is too old to be inserted';
  END IF;
  
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
COMMENT ON TABLE news_headlines IS 'Stores news headlines with optimized indexing for recent article retrieval';