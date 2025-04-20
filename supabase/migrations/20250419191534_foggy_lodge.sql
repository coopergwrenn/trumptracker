/*
  # Fix comments pagination function

  1. Changes
    - Drop existing function first to avoid parameter default conflicts
    - Recreate function with proper parameter defaults
    - Maintain existing functionality while fixing the column ambiguity
    - Optimize query performance with proper indexes

  2. Technical Details
    - Use explicit DROP FUNCTION before recreation
    - Use table aliases consistently
    - Maintain proper ordering of comments
*/

-- First drop the existing function
DROP FUNCTION IF EXISTS get_paginated_comments_v2(uuid, integer, timestamp with time zone);

-- Create simplified pagination function
CREATE OR REPLACE FUNCTION get_paginated_comments_v2(
  p_headline_id uuid,
  p_limit integer DEFAULT 10,
  p_cursor timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
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
  WITH root_comments AS (
    -- Get root comments
    SELECT 
      c.id,
      c.comment_text,
      c.anonymous_name,
      c.created_at,
      c.parent_id,
      c.depth,
      c.reply_count
    FROM headline_comments c
    WHERE 
      c.headline_id = p_headline_id
      AND c.parent_id IS NULL
      AND (p_cursor IS NULL OR c.created_at < p_cursor)
    ORDER BY c.created_at DESC
    LIMIT p_limit
  ),
  replies AS (
    -- Get replies for root comments
    SELECT 
      c.id,
      c.comment_text,
      c.anonymous_name,
      c.created_at,
      c.parent_id,
      c.depth,
      c.reply_count
    FROM headline_comments c
    WHERE c.parent_id IN (SELECT id FROM root_comments)
    AND c.depth <= 2
  ),
  combined AS (
    -- Combine root comments and replies
    SELECT * FROM root_comments
    UNION ALL
    SELECT * FROM replies
  )
  SELECT 
    c.*,
    -- Check if there are more root comments
    EXISTS (
      SELECT 1 
      FROM headline_comments h
      WHERE 
        h.headline_id = p_headline_id
        AND h.parent_id IS NULL
        AND h.created_at < (SELECT MIN(created_at) FROM root_comments)
    ) as has_more
  FROM combined c
  ORDER BY
    COALESCE(c.parent_id::text, c.id::text),
    CASE WHEN c.parent_id IS NULL THEN c.created_at END DESC NULLS FIRST,
    CASE WHEN c.parent_id IS NOT NULL THEN c.created_at END ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(uuid, integer, timestamp with time zone) TO public;
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(uuid, integer, timestamp with time zone) TO authenticated;

-- Ensure indexes exist for performance
DROP INDEX IF EXISTS idx_headline_comments_pagination;
DROP INDEX IF EXISTS idx_headline_comments_replies;

CREATE INDEX idx_headline_comments_pagination
ON headline_comments (headline_id, parent_id, created_at DESC);

CREATE INDEX idx_headline_comments_replies
ON headline_comments (parent_id, created_at ASC)
WHERE parent_id IS NOT NULL;