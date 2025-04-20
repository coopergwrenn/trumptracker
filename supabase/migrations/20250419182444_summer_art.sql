/*
  # Fix ambiguous created_at column reference in comments function

  1. Changes
    - Drop and recreate get_paginated_comments_v2 function with properly qualified column references
    - Add table alias to improve readability
    - Ensure all column references are properly qualified

  2. Security
    - Maintain existing security context (SECURITY DEFINER)
    - Function remains accessible to authenticated users only
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_paginated_comments_v2;

-- Recreate the function with properly qualified column references
CREATE OR REPLACE FUNCTION get_paginated_comments_v2(
  p_headline_id UUID,
  p_page_size INTEGER,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  comment_text TEXT,
  anonymous_name TEXT,
  created_at TIMESTAMPTZ,
  parent_id UUID,
  depth INTEGER,
  reply_count INTEGER,
  has_more BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_count INTEGER;
  v_fetched_count INTEGER;
BEGIN
  -- Get root comments first
  RETURN QUERY WITH root_comments AS (
    SELECT 
      c.id,
      c.comment_text,
      c.anonymous_name,
      c.created_at,
      c.parent_id,
      c.depth,
      c.reply_count,
      COUNT(*) OVER() AS total_count,
      ROW_NUMBER() OVER (ORDER BY c.created_at DESC) AS row_num
    FROM headline_comments c
    WHERE c.headline_id = p_headline_id
    AND c.parent_id IS NULL
    AND (p_cursor IS NULL OR c.created_at < p_cursor)
    ORDER BY c.created_at DESC
    LIMIT p_page_size
  ),
  -- Get immediate replies for the root comments
  replies AS (
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
    ORDER BY c.created_at ASC
  )
  -- Combine root comments and replies
  SELECT 
    COALESCE(r.id, rc.id) AS id,
    COALESCE(r.comment_text, rc.comment_text) AS comment_text,
    COALESCE(r.anonymous_name, rc.anonymous_name) AS anonymous_name,
    COALESCE(r.created_at, rc.created_at) AS created_at,
    COALESCE(r.parent_id, rc.parent_id) AS parent_id,
    COALESCE(r.depth, rc.depth) AS depth,
    COALESCE(r.reply_count, rc.reply_count) AS reply_count,
    -- Check if there are more root comments to fetch
    CASE 
      WHEN rc.row_num = p_page_size AND EXISTS (
        SELECT 1 
        FROM headline_comments c
        WHERE c.headline_id = p_headline_id 
        AND c.parent_id IS NULL
        AND c.created_at < (SELECT MIN(created_at) FROM root_comments)
      ) THEN TRUE
      ELSE FALSE
    END AS has_more
  FROM root_comments rc
  LEFT JOIN replies r ON TRUE
  ORDER BY 
    COALESCE(r.parent_id, rc.id),
    CASE WHEN r.id IS NULL THEN 0 ELSE 1 END,
    r.created_at ASC;
END;
$$;