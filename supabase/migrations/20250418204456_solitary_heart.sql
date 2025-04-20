/*
  # Improve Comments System

  1. Changes
    - Add depth and reply_count columns
    - Add constraints and triggers
    - Create optimized indexes
    - Create pagination function with proper recursion

  2. Security
    - Enable RLS
    - Add policies for public access
*/

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

-- Add constraint for max reply depth
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'headline_comments' AND constraint_name = 'max_comment_depth'
  ) THEN
    ALTER TABLE headline_comments
    ADD CONSTRAINT max_comment_depth CHECK (depth <= 2);
  END IF;
END $$;

-- Add constraint for non-empty comments
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

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_headline_comments_headline_id
ON headline_comments(headline_id);

CREATE INDEX IF NOT EXISTS idx_headline_comments_parent_id
ON headline_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_headline_comments_created_at
ON headline_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_headline_comments_thread
ON headline_comments(headline_id, parent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_headline_comments_replies
ON headline_comments(parent_id, created_at);

CREATE INDEX IF NOT EXISTS idx_headline_comments_reply_count
ON headline_comments(headline_id, reply_count DESC);

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

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS get_paginated_comments_v2(uuid, integer, timestamp with time zone);

-- Create the pagination function with proper return type
CREATE OR REPLACE FUNCTION get_paginated_comments_v2(
  p_headline_id UUID,
  p_page_size INT,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  comment_text TEXT,
  anonymous_name TEXT,
  created_at TIMESTAMPTZ,
  parent_id UUID,
  depth INT,
  reply_count INT,
  has_more BOOLEAN
) AS $$
DECLARE
  v_min_root_date TIMESTAMPTZ;
BEGIN
  -- Create temporary table for root comments
  CREATE TEMPORARY TABLE temp_root_comments ON COMMIT DROP AS
  SELECT 
    id,
    comment_text,
    anonymous_name,
    created_at,
    parent_id,
    depth,
    reply_count
  FROM headline_comments
  WHERE headline_id = p_headline_id 
    AND parent_id IS NULL
    AND (p_cursor IS NULL OR created_at < p_cursor)
  ORDER BY created_at DESC
  LIMIT p_page_size;

  -- Get minimum date from root comments for pagination
  SELECT MIN(created_at) INTO v_min_root_date FROM temp_root_comments;

  -- Create temporary table for all comments in threads
  CREATE TEMPORARY TABLE temp_thread_comments ON COMMIT DROP AS
  WITH RECURSIVE comment_tree AS (
    -- Start with root comments
    SELECT * FROM temp_root_comments
    
    UNION ALL
    
    -- Add replies
    SELECT 
      c.id,
      c.comment_text,
      c.anonymous_name,
      c.created_at,
      c.parent_id,
      c.depth,
      c.reply_count
    FROM headline_comments c
    JOIN comment_tree t ON c.parent_id = t.id
    WHERE c.depth <= 2
  )
  SELECT * FROM comment_tree;

  -- Return results with has_more flag
  RETURN QUERY
  SELECT 
    c.id,
    c.comment_text,
    c.anonymous_name,
    c.created_at,
    c.parent_id,
    c.depth,
    c.reply_count,
    EXISTS (
      SELECT 1 
      FROM headline_comments h
      WHERE h.headline_id = p_headline_id 
        AND h.parent_id IS NULL
        AND h.created_at < v_min_root_date
    ) AS has_more
  FROM temp_thread_comments c
  ORDER BY
    COALESCE(c.parent_id::text, c.id::text),
    CASE WHEN c.parent_id IS NULL THEN c.created_at END DESC NULLS LAST,
    CASE WHEN c.parent_id IS NOT NULL THEN c.created_at END ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(UUID, INT, TIMESTAMPTZ) TO public;

-- Enable RLS and set up policies
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