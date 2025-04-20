/*
  # Fix Comments Pagination - Final Version

  1. Changes
    - Simplify pagination logic to avoid ambiguous column references
    - Use temporary tables for better performance
    - Optimize query structure for thread-based comments
    - Fix ordering of comments and replies
    - Add proper indexes for performance

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

  -- Get all replies for these root comments
  CREATE TEMP TABLE all_replies ON COMMIT DROP AS
  SELECT 
    hc.id,
    hc.comment_text,
    hc.anonymous_name,
    hc.created_at,
    hc.parent_id,
    hc.depth,
    hc.reply_count
  FROM headline_comments hc
  INNER JOIN root_comments rc ON hc.parent_id = rc.id
  WHERE hc.depth <= 2;

  -- Return combined results
  RETURN QUERY
  WITH combined_comments AS (
    -- Root comments
    SELECT
      rc.id,
      rc.comment_text,
      rc.anonymous_name,
      rc.created_at,
      rc.parent_id,
      rc.depth,
      rc.reply_count
    FROM root_comments rc

    UNION ALL

    -- Replies
    SELECT
      ar.id,
      ar.comment_text,
      ar.anonymous_name,
      ar.created_at,
      ar.parent_id,
      ar.depth,
      ar.reply_count
    FROM all_replies ar
  )
  SELECT
    cc.id,
    cc.comment_text,
    cc.anonymous_name,
    cc.created_at,
    cc.parent_id,
    cc.depth,
    cc.reply_count,
    -- Check for more root comments
    EXISTS (
      SELECT 1
      FROM headline_comments hc
      WHERE 
        hc.headline_id = p_headline_id
        AND hc.parent_id IS NULL
        AND hc.created_at < (
          SELECT MIN(created_at)
          FROM root_comments
        )
    ) as has_more
  FROM combined_comments cc
  ORDER BY
    -- Group by thread (root comment id)
    COALESCE(cc.parent_id::text, cc.id::text),
    -- Root comments descending by date
    CASE WHEN cc.parent_id IS NULL THEN cc.created_at END DESC NULLS LAST,
    -- Replies ascending by date within each thread
    CASE WHEN cc.parent_id IS NOT NULL THEN cc.created_at END ASC NULLS LAST;

END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(uuid, integer, timestamp with time zone) TO public;

-- Ensure indexes exist for performance
DROP INDEX IF EXISTS idx_headline_comments_pagination;
DROP INDEX IF EXISTS idx_headline_comments_replies;

CREATE INDEX idx_headline_comments_pagination
ON headline_comments (headline_id, parent_id, created_at DESC);

CREATE INDEX idx_headline_comments_replies
ON headline_comments (parent_id, created_at ASC)
WHERE parent_id IS NOT NULL;