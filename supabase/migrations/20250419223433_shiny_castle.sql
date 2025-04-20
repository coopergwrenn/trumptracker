/*
  # Simplify comments system
  
  1. Changes
    - Remove threading/reply functionality
    - Remove depth tracking
    - Remove reply counts
    - Simplify pagination
    - Add basic indexes
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_paginated_comments_v2(uuid, integer, timestamp with time zone);

-- Create new simplified function
CREATE OR REPLACE FUNCTION get_comments(
  p_headline_id uuid,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  comment_text text,
  anonymous_name text,
  created_at timestamptz,
  total_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.comment_text,
    c.anonymous_name,
    c.created_at,
    COUNT(*) OVER() as total_count
  FROM headline_comments c
  WHERE c.headline_id = p_headline_id
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_comments TO public;
GRANT EXECUTE ON FUNCTION get_comments TO authenticated;

-- Create optimized index
DROP INDEX IF EXISTS idx_headline_comments_list;
CREATE INDEX idx_headline_comments_basic
ON headline_comments (headline_id, created_at DESC);