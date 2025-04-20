/*
  # Fix comments pagination function

  1. Changes
    - Restructure the recursive CTE to properly handle UNION ALL
    - Fix column references and table aliases
    - Maintain existing functionality while fixing syntax issues

  2. Security
    - Maintain SECURITY DEFINER context
    - Keep existing permissions
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
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_min_date timestamptz;
BEGIN
  -- Create temp table for root comments
  CREATE TEMP TABLE root_comments AS
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

  -- Get minimum date for pagination
  SELECT MIN(created_at) INTO v_min_date FROM root_comments;

  -- Create temp table for replies using recursive CTE
  CREATE TEMP TABLE all_replies AS
  WITH RECURSIVE comment_tree AS (
    -- Base case: direct replies to root comments
    SELECT 
      hc.id,
      hc.comment_text,
      hc.anonymous_name,
      hc.created_at,
      hc.parent_id,
      hc.depth,
      hc.reply_count,
      1 as level
    FROM headline_comments hc
    INNER JOIN root_comments rc ON hc.parent_id = rc.id
    WHERE hc.depth <= 2

    UNION ALL

    -- Recursive case: replies to replies
    SELECT 
      hc.id,
      hc.comment_text,
      hc.anonymous_name,
      hc.created_at,
      hc.parent_id,
      hc.depth,
      hc.reply_count,
      ct.level + 1
    FROM headline_comments hc
    INNER JOIN comment_tree ct ON hc.parent_id = ct.id
    WHERE hc.depth <= 2
  )
  SELECT 
    id,
    comment_text,
    anonymous_name,
    created_at,
    parent_id,
    depth,
    reply_count
  FROM comment_tree;

  -- Return combined results
  RETURN QUERY
  SELECT
    c.id,
    c.comment_text,
    c.anonymous_name,
    c.created_at,
    c.parent_id,
    c.depth,
    c.reply_count,
    EXISTS (
      SELECT 1
      FROM headline_comments h
      WHERE 
        h.headline_id = p_headline_id
        AND h.parent_id IS NULL
        AND h.created_at < v_min_date
    ) as has_more
  FROM (
    SELECT * FROM root_comments
    UNION ALL
    SELECT * FROM all_replies
  ) c
  ORDER BY
    COALESCE(c.parent_id::text, c.id::text),
    CASE WHEN c.parent_id IS NULL THEN c.created_at END DESC NULLS LAST,
    CASE WHEN c.parent_id IS NOT NULL THEN c.created_at END ASC NULLS LAST;

  -- Clean up temp tables
  DROP TABLE root_comments;
  DROP TABLE all_replies;
END;
$$;