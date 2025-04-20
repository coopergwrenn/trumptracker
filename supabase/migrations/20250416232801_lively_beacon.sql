/*
  # Add anonymous comments functionality

  1. New Tables
    - `headline_comments`
      - `id` (uuid, primary key)
      - `headline_id` (references news_headlines)
      - `comment_text` (text, not null)
      - `anonymous_name` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for public read/write access
    - Add index for faster headline_id lookups
*/

-- Create the comments table
CREATE TABLE IF NOT EXISTS headline_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_id uuid REFERENCES news_headlines(id) NOT NULL,
  comment_text text NOT NULL,
  anonymous_name text DEFAULT 'Guest' || floor(random() * 10000)::text,
  created_at timestamptz DEFAULT now(),
  
  -- Add constraint to ensure comment_text isn't empty
  CONSTRAINT comment_text_not_empty CHECK (length(trim(comment_text)) > 0)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_headline_comments_headline_id 
  ON headline_comments(headline_id);

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

-- Add helpful comment
COMMENT ON TABLE headline_comments IS 'Stores anonymous comments for news headlines';