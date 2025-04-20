/*
  # Fix ambiguous ID column in comments query

  1. Changes
    - Update get_paginated_comments_v2 function to explicitly reference table columns
    - Fix ambiguous 'id' column reference by specifying table name
    - Maintain existing functionality while improving query clarity

  2. Security
    - No changes to RLS policies
    - Function remains accessible to all authenticated users
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
  v_query text;
BEGIN
  -- Build the main query
  v_query := '
    WITH RECURSIVE comment_tree AS (
      -- Get root comments
      SELECT 
        hc.id,
        hc.comment_text,
        hc.anonymous_name,
        hc.created_at,
        hc.parent_id,
        hc.depth,
        hc.reply_count,
        1 as tree_order
      FROM headline_comments hc
      WHERE hc.headline_id = $1 
        AND hc.parent_id IS NULL
        AND ($2::timestamptz IS NULL OR hc.created_at < $2)
      
      UNION ALL
      
      -- Get replies
      SELECT 
        r.id,
        r.comment_text,
        r.anonymous_name,
        r.created_at,
        r.parent_id,
        r.depth,
        r.reply_count,
        tree_order + 1
      FROM headline_comments r
      JOIN comment_tree ct ON ct.id = r.parent_id
      WHERE r.headline_id = $1
    )
    SELECT 
      ct.id,
      ct.comment_text,
      ct.anonymous_name,
      ct.created_at,
      ct.parent_id,
      ct.depth,
      ct.reply_count,
      EXISTS (
        SELECT 1 
        FROM headline_comments hc
        WHERE hc.headline_id = $1 
          AND hc.parent_id IS NULL
          AND ($2::timestamptz IS NULL OR hc.created_at < $2)
        OFFSET $3
        LIMIT 1
      ) as has_more
    FROM comment_tree ct
    ORDER BY 
      CASE WHEN ct.parent_id IS NULL THEN ct.created_at END DESC,
      CASE WHEN ct.parent_id IS NOT NULL THEN ct.tree_order END ASC,
      ct.created_at ASC
    LIMIT $3;
  ';

  -- Execute the query with parameters
  RETURN QUERY EXECUTE v_query 
  USING p_headline_id, p_cursor, p_page_size;
END;
$$;