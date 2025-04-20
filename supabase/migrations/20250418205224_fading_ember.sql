/*
  # Fix ambiguous ID column in comments pagination

  1. Changes
    - Update get_paginated_comments_v2 function to explicitly reference table columns
    - Fix ambiguous 'id' column references
    - Maintain existing functionality while improving column specificity

  2. Security
    - Function remains accessible to all users (no security changes needed)
    - Maintains existing RLS policies
*/

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
  v_has_more boolean;
  v_fetch_size integer;
BEGIN
  -- Add 1 to page size to check if there are more results
  v_fetch_size := p_page_size + 1;
  
  RETURN QUERY WITH comments_with_replies AS (
    SELECT 
      hc.id,
      hc.comment_text,
      hc.anonymous_name,
      hc.created_at,
      hc.parent_id,
      hc.depth,
      hc.reply_count,
      ROW_NUMBER() OVER (
        PARTITION BY CASE WHEN hc.parent_id IS NULL THEN hc.id ELSE hc.parent_id END 
        ORDER BY hc.created_at DESC
      ) as reply_rank
    FROM headline_comments hc
    WHERE 
      hc.headline_id = p_headline_id
      AND (
        p_cursor IS NULL 
        OR (
          hc.parent_id IS NULL AND hc.created_at < p_cursor
          OR hc.parent_id IS NOT NULL
        )
      )
  )
  SELECT 
    cr.id,
    cr.comment_text,
    cr.anonymous_name,
    cr.created_at,
    cr.parent_id,
    cr.depth,
    cr.reply_count,
    EXISTS (
      SELECT 1 
      FROM headline_comments hc
      WHERE 
        hc.headline_id = p_headline_id 
        AND hc.parent_id IS NULL
        AND hc.created_at < (
          SELECT MIN(created_at)
          FROM (
            SELECT created_at
            FROM comments_with_replies
            WHERE parent_id IS NULL
            LIMIT v_fetch_size
          ) t
        )
    ) as has_more
  FROM comments_with_replies cr
  WHERE 
    (cr.parent_id IS NULL OR cr.reply_rank <= 3)
  ORDER BY 
    CASE WHEN cr.parent_id IS NULL THEN cr.created_at ELSE (
      SELECT created_at 
      FROM headline_comments 
      WHERE id = cr.parent_id
    ) END DESC,
    cr.parent_id NULLS FIRST,
    cr.created_at DESC
  LIMIT v_fetch_size;
END;
$$;