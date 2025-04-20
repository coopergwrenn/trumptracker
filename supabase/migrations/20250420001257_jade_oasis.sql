/*
  # Create new comments system
  
  1. New Table
    - Simple headline_comments table
    - Optimized indexes
    - RLS policies for public access
    - Status tracking for optimistic updates
*/

-- Create new comments table
CREATE TABLE headline_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_id uuid REFERENCES news_headlines(id) NOT NULL,
  comment_text text NOT NULL,
  anonymous_name text DEFAULT 'Anonymous',
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'visible' CHECK (status IN ('visible', 'deleted')),
  
  -- Ensure non-empty comments
  CONSTRAINT comment_text_not_empty CHECK (length(trim(comment_text)) > 0)
);

-- Create index for fast lookups
CREATE INDEX idx_headline_comments_lookup 
ON headline_comments(headline_id, status, created_at DESC);

-- Enable RLS
ALTER TABLE headline_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can read visible comments"
  ON headline_comments
  FOR SELECT
  TO public
  USING (status = 'visible');

CREATE POLICY "Anyone can insert comments"
  ON headline_comments
  FOR INSERT
  TO public
  WITH CHECK (status = 'visible');