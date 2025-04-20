/*
  # Fix comments system

  1. Changes
    - Add optimized indexes for comment retrieval
    - Update comment retrieval function to use simple parent/child relationships
    - Maintain existing functionality without ltree dependency

  2. Security
    - Maintain existing RLS policies
    - Keep security definer function for safe access
*/

-- Create optimized indexes for comment queries
CREATE INDEX IF NOT EXISTS idx_headline_comments_combined
ON headline_comments(headline_id, parent_id, created_at DESC);

-- Create index for reply counts
CREATE INDEX IF NOT EXISTS idx_headline_comments_reply_count
ON headline_comments(headline_id, reply_count DESC);

-- Drop existing function to recreate with improved logic
DROP FUNCTION IF EXISTS get_paginated_comments;

-- Create improved comment retrieval function
CREATE OR REPLACE FUNCTION get_paginated_comments(
  p_headline_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  comment_text TEXT,
  anonymous_name TEXT,
  created_at TIMESTAMPTZ,
  parent_id UUID,
  depth INTEGER,
  reply_count INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get root comments with their immediate replies
  RETURN QUERY
  WITH root_comments AS (
    -- First get the root level comments
    SELECT *
    FROM headline_comments
    WHERE headline_id = p_headline_id
      AND parent_id IS NULL
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ),
  all_comments AS (
    -- Combine root comments with their replies
    SELECT 
      c.*,
      1 as sort_order -- Root comments first
    FROM root_comments c
    
    UNION ALL
    
    -- Get replies to the root comments
    SELECT 
      c.*,
      2 as sort_order -- Replies second
    FROM headline_comments c
    INNER JOIN root_comments r ON c.parent_id = r.id
    WHERE c.headline_id = p_headline_id
      AND c.depth <= 2
  )
  SELECT
    ac.id,
    ac.comment_text,
    ac.anonymous_name,
    ac.created_at,
    ac.parent_id,
    ac.depth,
    ac.reply_count
  FROM all_comments ac
  ORDER BY
    ac.sort_order, -- Root comments first, then replies
    CASE 
      WHEN ac.parent_id IS NULL THEN ac.created_at -- Sort root comments by newest first
      ELSE NULL 
    END DESC NULLS LAST,
    ac.parent_id, -- Group replies by parent
    ac.created_at ASC; -- Sort replies chronologically
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_paginated_comments TO public;
GRANT EXECUTE ON FUNCTION get_paginated_comments TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_paginated_comments IS 'Retrieves paginated comments with proper threading order';