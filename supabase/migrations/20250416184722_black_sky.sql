/*
  # Update news headlines policies for public access

  1. Changes
    - Add public access policy for shared articles
    - Update existing policies to ensure proper access control
    - Add indexes for better query performance

  2. Security
    - Maintain RLS
    - Allow public read-only access to headlines
    - Preserve authenticated user access
*/

-- Create index for faster ID lookups
CREATE INDEX IF NOT EXISTS idx_news_headlines_id ON news_headlines(id);

-- Create index for faster URL lookups
CREATE INDEX IF NOT EXISTS idx_news_headlines_url ON news_headlines(url);

-- Create index for faster published_at sorting
CREATE INDEX IF NOT EXISTS idx_news_headlines_published_at ON news_headlines(published_at DESC);

-- Ensure RLS is enabled
ALTER TABLE news_headlines ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view shared headlines" ON news_headlines;
DROP POLICY IF EXISTS "Authenticated users can read headlines" ON news_headlines;
DROP POLICY IF EXISTS "Service role can manage headlines" ON news_headlines;

-- Create comprehensive policies
CREATE POLICY "Public can view shared headlines"
  ON news_headlines
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can read headlines"
  ON news_headlines
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage headlines"
  ON news_headlines
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment to explain the policies
COMMENT ON TABLE news_headlines IS 'Stores news headlines with both original and AI-neutralized content. Public read access enabled for sharing.';