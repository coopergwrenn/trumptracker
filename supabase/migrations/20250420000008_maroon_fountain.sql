/*
  # Rebuild Comments System

  1. New Tables
    - `headline_comments`
      - `id` (uuid, primary key)
      - `headline_id` (references news_headlines)
      - `comment_text` (text, not null)
      - `anonymous_name` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for public access
    - Add indexes for performance
*/

-- Drop existing comments table if it exists
DROP TABLE IF EXISTS headline_comments CASCADE;

-- Create new comments table
CREATE TABLE headline_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_id uuid REFERENCES news_headlines(id) NOT NULL,
  comment_text text NOT NULL,
  anonymous_name text DEFAULT 'Guest' || floor(random() * 10000)::text,
  created_at timestamptz DEFAULT now(),
  
  -- Add constraint to ensure comment_text isn't empty
  CONSTRAINT comment_text_not_empty CHECK (length(trim(comment_text)) > 0)
);

-- Create indexes for performance
CREATE INDEX idx_headline_comments_headline_created
ON headline_comments(headline_id, created_at DESC);

-- Enable RLS
ALTER TABLE headline_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can read comments"
  ON headline_comments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert comments"
  ON headline_comments
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create function to get paginated comments
CREATE OR REPLACE FUNCTION get_comments(
  p_headline_id uuid,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  comment_text text,
  anonymous_name text,
  created_at timestamptz,
  total_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.comment_text,
    c.anonymous_name,
    c.created_at,
    COUNT(*) OVER() as total_count
  FROM headline_comments c
  WHERE c.headline_id = p_headline_id
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_comments TO public;
GRANT EXECUTE ON FUNCTION get_comments TO authenticated;