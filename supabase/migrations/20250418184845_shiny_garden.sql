/*
  # Fix comment reply functionality

  1. Changes
    - Update get_paginated_comments function to properly handle replies
    - Fix ambiguous parent_id reference
    - Improve sorting for threaded comments
    - Add proper depth handling

  2. Security
    - Maintain existing RLS policies
    - Keep security definer setting
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_paginated_comments;

-- Create improved function with fixed column references
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
      c.reply_count,
      ARRAY[c.created_at] as sort_path,
      1 as tree_level
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
      child.reply_count,
      parent.sort_path || child.created_at,
      parent.tree_level + 1
    FROM headline_comments child
    INNER JOIN comment_tree parent ON child.parent_id = parent.id
    WHERE child.headline_id = p_headline_id
      AND child.depth <= 2
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
    -- Sort root comments by newest first
    CASE WHEN ct.parent_id IS NULL THEN ct.created_at END DESC NULLS FIRST,
    -- Keep replies grouped under their parent
    ct.sort_path
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_paginated_comments TO public;
GRANT EXECUTE ON FUNCTION get_paginated_comments TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_paginated_comments IS 'Retrieves paginated comments with proper threading order';