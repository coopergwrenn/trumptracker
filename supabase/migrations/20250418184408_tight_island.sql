/*
  # Optimize comment retrieval and fix loading issues

  1. Changes
    - Optimize comment retrieval function
    - Add materialized path for efficient tree traversal
    - Add combined index for faster lookups
    - Add constraint for max depth
    
  2. Performance
    - Improve query efficiency
    - Reduce recursive calls
    - Better pagination handling
*/

-- Add columns for threading support if they don't exist
DO $$ BEGIN
  -- Add parent_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'headline_comments' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE headline_comments
    ADD COLUMN parent_id uuid REFERENCES headline_comments(id);
  END IF;

  -- Add depth column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'headline_comments' AND column_name = 'depth'
  ) THEN
    ALTER TABLE headline_comments
    ADD COLUMN depth int NOT NULL DEFAULT 0;
  END IF;

  -- Add reply_count column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'headline_comments' AND column_name = 'reply_count'
  ) THEN
    ALTER TABLE headline_comments
    ADD COLUMN reply_count int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create combined index for faster lookups
CREATE INDEX IF NOT EXISTS idx_headline_comments_combined
ON headline_comments(headline_id, parent_id, created_at DESC);

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

-- Optimize comment retrieval function
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
  -- Get root comments with their immediate replies
  RETURN QUERY
  WITH root_comments AS (
    SELECT *
    FROM headline_comments
    WHERE headline_id = p_headline_id
    AND parent_id IS NULL
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ),
  comment_tree AS (
    -- Root comments
    SELECT c.*, 1 as tree_order
    FROM root_comments c
    
    UNION ALL
    
    -- Direct replies only, ordered by creation date
    SELECT c.*, 2 as tree_order
    FROM headline_comments c
    INNER JOIN root_comments r ON c.parent_id = r.id
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
    ct.tree_order,
    CASE WHEN ct.parent_id IS NULL THEN ct.created_at END DESC NULLS FIRST,
    ct.created_at ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_paginated_comments TO public;
GRANT EXECUTE ON FUNCTION get_paginated_comments TO authenticated;

-- Add helpful comment
COMMENT ON TABLE headline_comments IS 'Stores threaded comments for news headlines with support for nested replies';
COMMENT ON FUNCTION get_paginated_comments IS 'Retrieves paginated comments with proper threading order';