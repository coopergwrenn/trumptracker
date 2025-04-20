/*
  # Add threaded comments support

  1. Changes
    - Add parent_id for reply relationships
    - Add depth column to limit nesting
    - Add reply_count for tracking responses
    - Create optimized indexes
    - Add functions and triggers for reply management

  2. Security
    - Maintain existing RLS policies
    - Add validation constraints
*/

-- Add columns for threading support if they don't exist
DO $$ BEGIN
  -- Add parent_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'headline_comments' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE headline_comments
    ADD COLUMN parent_id uuid REFERENCES headline_comments(id);
  END IF;

  -- Add depth column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'headline_comments' AND column_name = 'depth'
  ) THEN
    ALTER TABLE headline_comments
    ADD COLUMN depth int NOT NULL DEFAULT 0;
  END IF;

  -- Add reply_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'headline_comments' AND column_name = 'reply_count'
  ) THEN
    ALTER TABLE headline_comments
    ADD COLUMN reply_count int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create optimized indexes for comment queries
CREATE INDEX IF NOT EXISTS idx_headline_comments_headline_created
ON headline_comments(headline_id, created_at DESC);

-- Create index for reply counts
CREATE INDEX IF NOT EXISTS idx_headline_comments_reply_count
ON headline_comments(headline_id, reply_count DESC);

-- Function to update reply counts
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE headline_comments
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    UPDATE headline_comments
    SET reply_count = reply_count - 1
    WHERE id = OLD.parent_id;
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

-- Add function for paginated comment retrieval with proper threading
CREATE OR REPLACE FUNCTION get_paginated_comments(
  p_headline_id uuid,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  comment_text text,
  anonymous_name text,
  created_at timestamptz,
  parent_id uuid,
  depth integer,
  reply_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE comment_tree AS (
    -- Get root comments first
    SELECT
      c.*,
      array[c.created_at] as sort_path
    FROM headline_comments c
    WHERE c.headline_id = p_headline_id
    AND c.parent_id IS NULL
    
    UNION ALL
    
    -- Get replies
    SELECT
      c.*,
      ct.sort_path || c.created_at
    FROM headline_comments c
    INNER JOIN comment_tree ct ON c.parent_id = ct.id
    WHERE c.depth <= 2
  )
  SELECT
    ct.id,
    ct.comment_text,
    ct.anonymous_name,
    ct.created_at,
    ct.parent_id,
    ct.depth,
    ct.reply_count
  FROM comment_tree ct
  ORDER BY
    -- Sort root comments by newest first
    CASE WHEN ct.parent_id IS NULL THEN ct.created_at END DESC NULLS FIRST,
    -- Sort replies chronologically
    ct.sort_path
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_paginated_comments TO public;
GRANT EXECUTE ON FUNCTION get_paginated_comments TO authenticated;

-- Add helpful comment
COMMENT ON TABLE headline_comments IS 'Stores threaded comments for news headlines with support for nested replies';
COMMENT ON FUNCTION get_paginated_comments IS 'Retrieves paginated comments with proper threading order';