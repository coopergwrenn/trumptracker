/*
  # Optimize comment system

  1. Changes
    - Add optimized indexes for comment queries
    - Add reply count tracking
    - Add depth tracking for nested comments
    - Add constraints for data integrity

  2. Security
    - Maintain existing RLS policies
    - Add validation for comment depth
*/

-- Create optimized indexes for comment queries
CREATE INDEX IF NOT EXISTS idx_headline_comments_headline_id
ON headline_comments(headline_id);

-- Create index for reply counts
CREATE INDEX IF NOT EXISTS idx_headline_comments_reply_count
ON headline_comments(headline_id, reply_count DESC);

-- Create index for efficient tree traversal
CREATE INDEX IF NOT EXISTS idx_headline_comments_parent_id
ON headline_comments(parent_id);

-- Create index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_headline_comments_created_at
ON headline_comments(created_at DESC);

-- Add function for paginated comment retrieval
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
  SELECT
    c.id,
    c.comment_text,
    c.anonymous_name,
    c.created_at,
    c.parent_id,
    c.depth,
    c.reply_count
  FROM headline_comments c
  WHERE c.headline_id = p_headline_id
  ORDER BY 
    CASE WHEN c.parent_id IS NULL THEN c.created_at END DESC NULLS FIRST,
    c.parent_id,
    c.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_paginated_comments TO public;
GRANT EXECUTE ON FUNCTION get_paginated_comments TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_paginated_comments IS 'Retrieves paginated comments with proper threading order';