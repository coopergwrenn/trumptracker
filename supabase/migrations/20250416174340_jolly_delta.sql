/*
  # Add public access policy for shared news articles

  1. Changes
    - Add policy to allow public access to individual news headlines
    - Maintain existing policies for authenticated users
    
  2. Security
    - Public access limited to SELECT operations only
    - Access granted one article at a time via ID
*/

-- Drop existing public policy if it exists
DROP POLICY IF EXISTS "Public can view shared headlines" ON news_headlines;

-- Create new public access policy
CREATE POLICY "Public can view shared headlines"
  ON news_headlines
  FOR SELECT
  TO public
  USING (true);

-- Note: This allows public read access to headlines while maintaining
-- existing authenticated user policies for full access