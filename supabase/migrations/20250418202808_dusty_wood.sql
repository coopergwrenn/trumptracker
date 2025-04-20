/*
  # Comment System Upgrade

  1. New Features
    - Add depth and reply count columns
    - Add optimized indexes for fast retrieval
    - Add automatic reply count updates
    - Add paginated comment retrieval function

  2. Changes
    - Add new columns for depth tracking and reply counting
    - Create indexes for efficient querying
    - Add trigger for updating reply counts
    - Add RLS policies for public access

  3. Security
    - Enable RLS on comments table
    - Add policies for public read/write access
*/

-- First drop any existing functions with the same name
DROP FUNCTION IF EXISTS get_paginated_comments(uuid, integer, integer);
DROP FUNCTION IF EXISTS get_paginated_comments(uuid, integer, timestamp with time zone);

-- Add new columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'headline_comments' AND column_name = 'depth') 
  THEN
    ALTER TABLE headline_comments ADD COLUMN depth integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'headline_comments' AND column_name = 'reply_count') 
  THEN
    ALTER TABLE headline_comments ADD COLUMN reply_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add constraint for non-empty comments if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'headline_comments' AND constraint_name = 'comment_text_not_empty'
  ) THEN
    ALTER TABLE headline_comments
    ADD CONSTRAINT comment_text_not_empty CHECK (length(TRIM(BOTH FROM comment_text)) > 0);
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_headline_comments_combined
ON headline_comments(headline_id, parent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_headline_comments_thread
ON headline_comments(headline_id, parent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_headline_comments_replies
ON headline_comments(parent_id, created_at);

-- Function to update reply counts
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE headline_comments
      SET reply_count = reply_count + 1
      WHERE id = NEW.parent_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE headline_comments
      SET reply_count = reply_count - 1
      WHERE id = OLD.parent_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reply count updates
DROP TRIGGER IF EXISTS update_reply_count_trigger ON headline_comments;
CREATE TRIGGER update_reply_count_trigger
AFTER INSERT OR DELETE ON headline_comments
FOR EACH ROW
EXECUTE FUNCTION update_comment_reply_count();

-- Create new paginated comments function with cursor-based pagination
CREATE OR REPLACE FUNCTION get_paginated_comments_v2(
  p_headline_id uuid,
  p_page_size integer DEFAULT 10,
  p_cursor timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  headline_id uuid,
  comment_text text,
  anonymous_name text,
  created_at timestamptz,
  parent_id uuid,
  depth integer,
  reply_count integer,
  has_more boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE thread_comments AS (
    -- Base case: root comments
    (
      SELECT 
        c.id,
        c.headline_id,
        c.comment_text,
        c.anonymous_name,
        c.created_at,
        c.parent_id,
        c.depth,
        c.reply_count,
        false as has_more
      FROM headline_comments c
      WHERE c.headline_id = p_headline_id 
        AND c.parent_id IS NULL
        AND (p_cursor IS NULL OR c.created_at < p_cursor)
      ORDER BY c.created_at DESC
      LIMIT p_page_size
    )
    
    UNION ALL
    
    -- Recursive case: replies
    SELECT 
      r.id,
      r.headline_id,
      r.comment_text,
      r.anonymous_name,
      r.created_at,
      r.parent_id,
      r.depth,
      r.reply_count,
      false as has_more
    FROM headline_comments r
    INNER JOIN thread_comments tc ON r.parent_id = tc.id
    WHERE r.depth <= 2
  )
  SELECT 
    tc.id,
    tc.headline_id,
    tc.comment_text,
    tc.anonymous_name,
    tc.created_at,
    tc.parent_id,
    tc.depth,
    tc.reply_count,
    (EXISTS (
      SELECT 1 
      FROM headline_comments c
      WHERE c.headline_id = p_headline_id 
        AND c.parent_id IS NULL
        AND c.created_at < (
          SELECT MIN(created_at) 
          FROM thread_comments 
          WHERE parent_id IS NULL
        )
    )) as has_more
  FROM thread_comments tc
  ORDER BY
    COALESCE(tc.parent_id::text, tc.id::text),
    CASE WHEN tc.parent_id IS NULL THEN tc.created_at END DESC NULLS LAST,
    CASE WHEN tc.parent_id IS NOT NULL THEN tc.created_at END ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2 TO public;
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2 TO authenticated;

-- Update RLS policies
ALTER TABLE headline_comments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read comments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'headline_comments' AND policyname = 'Anyone can read comments'
  ) THEN
    CREATE POLICY "Anyone can read comments"
      ON headline_comments
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Allow anyone to insert comments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'headline_comments' AND policyname = 'Anyone can insert comments'
  ) THEN
    CREATE POLICY "Anyone can insert comments"
      ON headline_comments
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;