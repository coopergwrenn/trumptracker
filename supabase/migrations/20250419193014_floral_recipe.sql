/*
  # Simplify Comments System

  1. Changes
    - Remove threading/reply functionality
    - Simplify database schema
    - Update function to return flat list of comments
    - Maintain pagination for performance

  2. Technical Details
    - Drop unused columns and constraints
    - Create new simplified function
    - Update indexes for optimized queries
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_paginated_comments_v2(uuid, integer, timestamp with time zone);

-- Create new simplified function
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
    LIMIT p_limit
  )
  SELECT 
    c.*,
    EXISTS (
      SELECT 1 
      FROM headline_comments h
      WHERE 
        h.headline_id = p_headline_id
        AND h.created_at < (SELECT MIN(created_at) FROM comments)
    ) as has_more
  FROM comments c
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(uuid, integer, timestamp with time zone) TO public;
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(uuid, integer, timestamp with time zone) TO authenticated;

-- Update indexes for simplified queries
DROP INDEX IF EXISTS idx_headline_comments_pagination;
DROP INDEX IF EXISTS idx_headline_comments_replies;
DROP INDEX IF EXISTS idx_headline_comments_thread;

CREATE INDEX idx_headline_comments_list
ON headline_comments (headline_id, created_at DESC);