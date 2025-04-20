/*
  # Fix comments pagination function

  1. Changes
    - Drop existing function first to avoid parameter conflicts
    - Create new simplified comments pagination function
    - Add proper indexes for performance
*/

-- First drop the existing function
DROP FUNCTION IF EXISTS get_paginated_comments_v2(uuid, integer, timestamp with time zone);

-- Create new simplified function
CREATE OR REPLACE FUNCTION get_paginated_comments_v2(
  p_headline_id uuid,
  p_limit integer,
  p_cursor timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  comment_text text,
  anonymous_name text,
  created_at timestamptz,
  has_more boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH comments AS (
    SELECT 
      c.id,
      c.comment_text,
      c.anonymous_name,
      c.created_at,
      COUNT(*) OVER () > p_limit AS has_more
    FROM headline_comments c
    WHERE 
      c.headline_id = p_headline_id
      AND (p_cursor IS NULL OR c.created_at < p_cursor)
    ORDER BY c.created_at DESC
    LIMIT p_limit + 1
  )
  SELECT 
    c.id,
    c.comment_text,
    c.anonymous_name,
    c.created_at,
    c.has_more
  FROM comments c
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(uuid, integer, timestamp with time zone) TO public;
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(uuid, integer, timestamp with time zone) TO authenticated;

-- Update indexes for simplified queries
DROP INDEX IF EXISTS idx_headline_comments_pagination;
DROP INDEX IF EXISTS idx_headline_comments_replies;
DROP INDEX IF EXISTS idx_headline_comments_thread;

CREATE INDEX IF NOT EXISTS idx_headline_comments_list
ON headline_comments (headline_id, created_at DESC);