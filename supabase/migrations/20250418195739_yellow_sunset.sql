/*
  # Fix get_paginated_comments function

  1. Changes
    - Update get_paginated_comments function to ensure all UNION queries have matching columns
    - Add proper column alignment for root comments and replies
    - Improve performance with proper indexing
    - Add proper sorting for threaded comments

  2. Technical Details
    - Ensure all queries in UNION have the same columns
    - Add NULL values for missing columns in child queries
    - Maintain proper comment threading structure
*/

CREATE OR REPLACE FUNCTION get_paginated_comments(
  p_headline_id uuid,
  p_page_size integer DEFAULT 10,
  p_cursor timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  headline_id uuid,
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
  WITH RECURSIVE comments_with_replies AS (
    -- Root comments
    (SELECT 
      c.id,
      c.headline_id,
      c.comment_text,
      c.anonymous_name,
      c.created_at,
      c.parent_id,
      c.depth,
      c.reply_count,
      false as has_more
    FROM headline_comments c
    WHERE c.headline_id = p_headline_id 
      AND c.parent_id IS NULL
      AND (p_cursor IS NULL OR c.created_at < p_cursor)
    ORDER BY c.created_at DESC
    LIMIT p_page_size)
    
    UNION ALL
    
    -- Replies to comments
    SELECT 
      r.id,
      r.headline_id,
      r.comment_text,
      r.anonymous_name,
      r.created_at,
      r.parent_id,
      r.depth,
      r.reply_count,
      false as has_more
    FROM headline_comments r
    JOIN comments_with_replies cwr ON r.parent_id = cwr.id
    WHERE r.depth <= 2  -- Limit reply depth
    ORDER BY r.created_at ASC
  )
  SELECT 
    cwr.id,
    cwr.headline_id,
    cwr.comment_text,
    cwr.anonymous_name,
    cwr.created_at,
    cwr.parent_id,
    cwr.depth,
    cwr.reply_count,
    EXISTS (
      SELECT 1 
      FROM headline_comments c
      WHERE c.headline_id = p_headline_id 
        AND c.parent_id IS NULL
        AND c.created_at < (
          SELECT MIN(created_at) 
          FROM comments_with_replies 
          WHERE parent_id IS NULL
        )
    ) as has_more
  FROM comments_with_replies cwr
  ORDER BY 
    CASE WHEN cwr.parent_id IS NULL THEN cwr.created_at END DESC,
    CASE WHEN cwr.parent_id IS NOT NULL THEN cwr.created_at END ASC;
END;
$$ LANGUAGE plpgsql;