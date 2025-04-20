/*
  # Performance Optimizations

  1. New Indexes
    - Composite indexes for efficient queries
    - Status and date filtering optimization
    - Source name lookups

  2. Constraints
    - Prevent duplicate headlines
    - Validate neutralization status
    - Enforce URL format
    - Implement data cleanup
*/

-- Create composite index for status and date filtering
CREATE INDEX IF NOT EXISTS idx_headlines_status_date 
ON news_headlines(neutralization_status, published_at DESC);

-- Create index for source filtering
CREATE INDEX IF NOT EXISTS idx_headlines_source_date
ON news_headlines(source_name, published_at DESC);

-- Create a function to check for duplicate headlines within 24 hours
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

-- Add constraint to ensure valid neutralization status
ALTER TABLE news_headlines
ADD CONSTRAINT valid_neutralization_status
CHECK (neutralization_status IN ('pending', 'completed', 'failed'));

-- Add constraint for URL format
ALTER TABLE news_headlines
ADD CONSTRAINT valid_url_format
CHECK (url ~* '^https?://.*');

-- Create function to clean up old headlines
CREATE OR REPLACE FUNCTION cleanup_old_headlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete failed headlines older than 90 days
  DELETE FROM news_headlines
  WHERE published_at < NOW() - INTERVAL '90 days'
  AND neutralization_status = 'failed';
  
  -- Delete headlines older than 180 days without comments
  DELETE FROM news_headlines
  WHERE published_at < NOW() - INTERVAL '180 days'
  AND id NOT IN (
    SELECT DISTINCT headline_id 
    FROM headline_comments
  );
END;
$$;

-- Add helpful comment
COMMENT ON TABLE news_headlines IS 'Stores news headlines with performance optimizations and data integrity constraints';