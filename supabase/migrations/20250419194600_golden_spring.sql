/*
  # Fix comments loading

  1. Changes
    - Drop existing function
    - Create new simplified comments function
    - Add optimized index
    - Remove threading/reply functionality to focus on core commenting
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_paginated_comments_v2(uuid, integer, timestamp with time zone);

-- Create new simplified function
CREATE OR REPLACE FUNCTION get_paginated_comments_v2(
  p_headline_id uuid,
  p_limit integer,
  p_cursor timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  comment_text text,
  anonymous_name text,
  created_at timestamptz,
  has_more boolean
) AS $$
DECLARE
  v_next_row_exists boolean;
BEGIN
  RETURN QUERY
  WITH numbered_comments AS (
    SELECT 
      hc.id,
      hc.comment_text,
      hc.anonymous_name,
      hc.created_at,
      ROW_NUMBER() OVER () as rn
    FROM headline_comments hc
    WHERE 
      hc.headline_id = p_headline_id
      AND (p_cursor IS NULL OR hc.created_at < p_cursor)
    ORDER BY hc.created_at DESC
    LIMIT p_limit + 1
  )
  SELECT 
    nc.id,
    nc.comment_text,
    nc.anonymous_name,
    nc.created_at,
    nc.rn > p_limit as has_more
  FROM numbered_comments nc
  WHERE nc.rn <= p_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(uuid, integer, timestamp with time zone) TO public;
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(uuid, integer, timestamp with time zone) TO authenticated;

-- Create optimized index for the simplified query
DROP INDEX IF EXISTS idx_headline_comments_list;
CREATE INDEX idx_headline_comments_list
ON headline_comments (headline_id, created_at DESC);