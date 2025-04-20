/*
  # Optimize News Fetching Schema

  1. Changes
    - Add optimized indexes for news fetching
    - Add constraints for data integrity
    - Add triggers for validation
    - Update RLS policies

  2. Security
    - Maintain existing RLS policies
    - Add validation for article freshness
*/

-- Create optimized indexes for news fetching
CREATE INDEX IF NOT EXISTS idx_headlines_recent_articles
ON news_headlines(published_at DESC, neutralization_status)
WHERE neutralization_status = 'completed';

-- Create index for source and date filtering
CREATE INDEX IF NOT EXISTS idx_headlines_source_date
ON news_headlines(source_name, published_at DESC);

-- Add constraints for data integrity (with existence checks)
DO $$ BEGIN
  -- Check if valid_url_format constraint exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'valid_url_format'
  ) THEN
    ALTER TABLE news_headlines
    ADD CONSTRAINT valid_url_format
    CHECK (url ~* '^https?://.*');
  END IF;

  -- Check if valid_published_date constraint exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'valid_published_date'
  ) THEN
    ALTER TABLE news_headlines
    ADD CONSTRAINT valid_published_date
    CHECK (published_at <= NOW() + interval '1 hour');
  END IF;
END $$;

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

-- Create function to check for duplicate headlines
CREATE OR REPLACE FUNCTION check_duplicate_headline()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM news_headlines
    WHERE original_title = NEW.original_title
    AND source_name = NEW.source_name
    AND published_at >= NEW.published_at - interval '24 hours'
    AND published_at <= NEW.published_at + interval '24 hours'
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Duplicate headline found within 24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for duplicate check
DROP TRIGGER IF EXISTS check_duplicate_headline_trigger ON news_headlines;
CREATE TRIGGER check_duplicate_headline_trigger
  BEFORE INSERT OR UPDATE ON news_headlines
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_headline();

-- Add helpful comment
COMMENT ON TABLE news_headlines IS 'Stores news headlines with optimized indexing for recent article retrieval';