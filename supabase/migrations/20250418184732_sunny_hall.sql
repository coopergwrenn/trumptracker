/*
  # Fix ambiguous parent_id reference in get_paginated_comments function

  1. Changes
    - Drop and recreate get_paginated_comments function with explicit table references
    - Add proper table aliases to avoid column ambiguity
    - Maintain existing functionality while fixing the column reference issue

  2. Security
    - Function remains accessible to all users (no security impact)
    - Maintains existing RLS policies
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_paginated_comments;

-- Recreate function with fixed column references
CREATE OR REPLACE FUNCTION get_paginated_comments(
  p_headline_id UUID,
  p_limit INTEGER,
  p_offset INTEGER
)
RETURNS TABLE (
  id UUID,
  comment_text TEXT,
  anonymous_name TEXT,
  created_at TIMESTAMPTZ,
  parent_id UUID,
  depth INTEGER,
  reply_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE comment_tree AS (
    -- Get root comments
    SELECT 
      c.id,
      c.comment_text,
      c.anonymous_name,
      c.created_at,
      c.parent_id,
      c.depth,
      c.reply_count
    FROM headline_comments c
    WHERE c.headline_id = p_headline_id
      AND c.parent_id IS NULL
    
    UNION ALL
    
    -- Get replies
    SELECT 
      child.id,
      child.comment_text,
      child.anonymous_name,
      child.created_at,
      child.parent_id,
      child.depth,
      child.reply_count
    FROM headline_comments child
    INNER JOIN comment_tree parent ON parent.id = child.parent_id
    WHERE child.headline_id = p_headline_id
  )
  SELECT 
    ct.id,
    ct.comment_text,
    ct.anonymous_name,
    ct.created_at,
    ct.parent_id,
    ct.depth,
    ct.reply_count
  FROM comment_tree ct
  ORDER BY 
    COALESCE(ct.parent_id::text, ct.id::text),
    ct.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;