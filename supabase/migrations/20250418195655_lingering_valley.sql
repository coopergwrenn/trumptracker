/*
  # Fix comment threading and pagination

  1. Changes
    - Fix ambiguous parent_id reference in SQL query
    - Improve comment sorting logic
    - Add proper indexes for performance
    - Update threading logic to maintain proper order

  2. Security
    - Maintain SECURITY DEFINER setting
    - Keep existing RLS policies
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
  WITH RECURSIVE thread_roots AS (
    -- Get root comments first, applying pagination
    SELECT 
      c.id,
      c.comment_text,
      c.anonymous_name,
      c.created_at,
      c.parent_id,
      c.depth,
      c.reply_count,
      c.created_at as root_created_at
    FROM headline_comments c
    WHERE c.headline_id = p_headline_id
      AND c.parent_id IS NULL
    ORDER BY c.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ),
  comment_tree AS (
    -- Include selected root comments
    SELECT 
      c.*,
      c.root_created_at as thread_sort,
      1 as sort_order
    FROM thread_roots c
    
    UNION ALL
    
    -- Include direct replies to selected root comments
    SELECT 
      c.id,
      c.comment_text,
      c.anonymous_name,
      c.created_at,
      c.parent_id,
      c.depth,
      c.reply_count,
      p.thread_sort,
      2 as sort_order
    FROM headline_comments c
    JOIN comment_tree p ON c.parent_id = p.id
    WHERE c.headline_id = p_headline_id
      AND c.depth <= 2
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
    ct.thread_sort DESC, -- Keep threads together, newest first
    ct.sort_order, -- Root comments before replies
    ct.created_at ASC; -- Chronological order within thread
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_paginated_comments TO public;
GRANT EXECUTE ON FUNCTION get_paginated_comments TO authenticated;

-- Create optimized indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_headline_comments_thread
ON headline_comments(headline_id, parent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_headline_comments_replies
ON headline_comments(parent_id, created_at ASC);

-- Add helpful comment
COMMENT ON FUNCTION get_paginated_comments IS 'Retrieves paginated comments with proper threading order';