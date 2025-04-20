/*
  # Simplify comments system

  1. Changes
    - Drop existing function
    - Create new simplified comments function without threading
    - Update indexes for better performance
*/

-- Drop existing function
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
      c.created_at
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
    -- Check if there are more comments after this page
    ROW_NUMBER() OVER () > p_limit as has_more
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