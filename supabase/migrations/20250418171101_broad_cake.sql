-- Create optimized indexes for comment queries
CREATE INDEX IF NOT EXISTS idx_headline_comments_headline_created
ON headline_comments(headline_id, created_at DESC);

-- Create index for reply counts
CREATE INDEX IF NOT EXISTS idx_headline_comments_reply_count
ON headline_comments(headline_id, reply_count DESC);

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
COMMENT ON FUNCTION get_paginated_comments IS 'Retrieves paginated comments with proper threading order';