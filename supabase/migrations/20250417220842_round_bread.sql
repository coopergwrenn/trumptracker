/*
  # Add X API Support

  1. New Tables
    - `x_posts`: Stores posts from X (Twitter) API
      - Links to news_headlines for context
      - Tracks engagement metrics
      - Implements soft delete

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create table for X posts
CREATE TABLE IF NOT EXISTS x_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_id uuid REFERENCES news_headlines(id),
  post_id text NOT NULL UNIQUE,
  author_id text NOT NULL,
  author_username text NOT NULL,
  content text NOT NULL,
  neutral_content text,
  posted_at timestamptz NOT NULL,
  likes_count integer DEFAULT 0,
  retweets_count integer DEFAULT 0,
  replies_count integer DEFAULT 0,
  quotes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Enable RLS
ALTER TABLE x_posts ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Authenticated users can read x_posts"
  ON x_posts
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Create index for faster lookups
CREATE INDEX idx_x_posts_headline_id ON x_posts(headline_id);
CREATE INDEX idx_x_posts_posted_at ON x_posts(posted_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_x_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_x_posts_updated_at
  BEFORE UPDATE ON x_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_x_posts_updated_at();

-- Add helpful comment
COMMENT ON TABLE x_posts IS 'Stores X (Twitter) posts related to news headlines';