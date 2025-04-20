/*
  # Fix Comments Pagination Function

  1. Changes
    - Simplify the pagination function to avoid ambiguous column references
    - Improve query performance with proper indexing
    - Fix ordering of comments and replies
    - Ensure proper handling of cursor-based pagination

  2. Security
    - Maintain existing RLS policies
    - Function remains accessible to public
*/

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS get_paginated_comments_v2(uuid, integer, timestamp with time zone);

-- Create simplified pagination function
CREATE OR REPLACE FUNCTION get_paginated_comments_v2(
  p_headline_id uuid,
  p_page_size integer,
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
DECLARE
  v_min_date timestamptz;
BEGIN
  -- Get root comments first
  CREATE TEMP TABLE root_comments ON COMMIT DROP AS
  SELECT 
    hc.id,
    hc.comment_text,
    hc.anonymous_name,
    hc.created_at,
    hc.parent_id,
    hc.depth,
    hc.reply_count
  FROM headline_comments hc
  WHERE 
    hc.headline_id = p_headline_id
    AND hc.parent_id IS NULL
    AND (p_cursor IS NULL OR hc.created_at < p_cursor)
  ORDER BY hc.created_at DESC
  LIMIT p_page_size;

  -- Store minimum date for pagination
  SELECT MIN(created_at) INTO v_min_date FROM root_comments;

  -- Return combined results
  RETURN QUERY
  -- Root comments
  SELECT
    r.id,
    r.comment_text,
    r.anonymous_name,
    r.created_at,
    r.parent_id,
    r.depth,
    r.reply_count,
    EXISTS (
      SELECT 1
      FROM headline_comments h
      WHERE 
        h.headline_id = p_headline_id
        AND h.parent_id IS NULL
        AND h.created_at < v_min_date
    ) as has_more
  FROM root_comments r

  UNION ALL

  -- Replies
  SELECT
    h.id,
    h.comment_text,
    h.anonymous_name,
    h.created_at,
    h.parent_id,
    h.depth,
    h.reply_count,
    false as has_more
  FROM headline_comments h
  JOIN root_comments r ON h.parent_id = r.id
  WHERE h.depth <= 2

  -- Final ordering
  ORDER BY
    COALESCE(parent_id::text, id::text),
    CASE 
      WHEN parent_id IS NULL THEN created_at
    END DESC NULLS LAST,
    CASE 
      WHEN parent_id IS NOT NULL THEN created_at
    END ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(uuid, integer, timestamp with time zone) TO public;

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_headline_comments_pagination
ON headline_comments (headline_id, parent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_headline_comments_replies
ON headline_comments (parent_id, created_at ASC)
WHERE parent_id IS NOT NULL;