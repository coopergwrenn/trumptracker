/*
  # Fix comments pagination function

  1. Changes
    - Fix UNION ALL syntax in recursive CTE
    - Optimize query structure for better performance
    - Add proper comment ordering
    - Maintain thread consistency

  2. Technical Details
    - Use parentheses to properly scope the base case
    - Implement efficient pagination
    - Preserve comment threading
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
  WITH RECURSIVE thread_comments AS (
    -- Base case: root comments
    (
      SELECT 
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
      LIMIT p_page_size
    )
    
    UNION ALL
    
    -- Recursive case: replies
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
    INNER JOIN thread_comments tc ON r.parent_id = tc.id
    WHERE r.depth <= 2
  )
  SELECT 
    tc.id,
    tc.headline_id,
    tc.comment_text,
    tc.anonymous_name,
    tc.created_at,
    tc.parent_id,
    tc.depth,
    tc.reply_count,
    (EXISTS (
      SELECT 1 
      FROM headline_comments c
      WHERE c.headline_id = p_headline_id 
        AND c.parent_id IS NULL
        AND c.created_at < (
          SELECT MIN(created_at) 
          FROM thread_comments 
          WHERE parent_id IS NULL
        )
    )) as has_more
  FROM thread_comments tc
  ORDER BY
    COALESCE(tc.parent_id::text, tc.id::text),
    CASE WHEN tc.parent_id IS NULL THEN tc.created_at END DESC NULLS LAST,
    CASE WHEN tc.parent_id IS NOT NULL THEN tc.created_at END ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Create index to optimize the recursive query
CREATE INDEX IF NOT EXISTS idx_headline_comments_thread
ON headline_comments (headline_id, parent_id, created_at DESC)
WHERE parent_id IS NULL;

-- Create index for replies
CREATE INDEX IF NOT EXISTS idx_headline_comments_replies
ON headline_comments (parent_id, created_at ASC)
WHERE parent_id IS NOT NULL;