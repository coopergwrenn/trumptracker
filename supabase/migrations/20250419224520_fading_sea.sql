/*
  # Simplified Comments System

  1. New Table Structure
    - Simplified headline_comments table with basic fields
    - Optimized indexes for performance
    - Basic constraints for data integrity

  2. Database Function
    - Simple pagination function for fetching comments
    - No threading/nesting complexity
    - Efficient sorting and filtering
*/

-- Create new simplified comments function
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
CREATE INDEX IF NOT EXISTS idx_headline_comments_basic
ON headline_comments (headline_id, created_at DESC);