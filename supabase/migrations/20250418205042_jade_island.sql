-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_paginated_comments(uuid, integer, integer);
DROP FUNCTION IF EXISTS get_paginated_comments(uuid, integer, timestamp with time zone);
DROP FUNCTION IF EXISTS get_paginated_comments_v2(uuid, integer, timestamp with time zone);

-- Create the pagination function with proper return type
CREATE OR REPLACE FUNCTION get_paginated_comments_v2(
  p_headline_id UUID,
  p_page_size INT,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  comment_text TEXT,
  anonymous_name TEXT,
  created_at TIMESTAMPTZ,
  parent_id UUID,
  depth INT,
  reply_count INT,
  has_more BOOLEAN
) AS $$
DECLARE
  v_min_root_date TIMESTAMPTZ;
BEGIN
  -- Get root comments
  CREATE TEMP TABLE temp_root_comments AS
  SELECT 
    id,
    comment_text,
    anonymous_name,
    created_at,
    parent_id,
    depth,
    reply_count
  FROM headline_comments
  WHERE headline_id = p_headline_id 
    AND parent_id IS NULL
    AND (p_cursor IS NULL OR created_at < p_cursor)
  ORDER BY created_at DESC
  LIMIT p_page_size;

  -- Get minimum date from root comments for pagination
  SELECT MIN(created_at) INTO v_min_root_date FROM temp_root_comments;

  -- Get all comments in threads
  CREATE TEMP TABLE temp_all_comments AS
  SELECT 
    id,
    comment_text,
    anonymous_name,
    created_at,
    parent_id,
    depth,
    reply_count
  FROM temp_root_comments

  UNION ALL

  SELECT 
    c.id,
    c.comment_text,
    c.anonymous_name,
    c.created_at,
    c.parent_id,
    c.depth,
    c.reply_count
  FROM headline_comments c
  JOIN temp_root_comments r ON c.parent_id = r.id
  WHERE c.depth <= 2;

  -- Return results with has_more flag
  RETURN QUERY
  SELECT 
    c.id,
    c.comment_text,
    c.anonymous_name,
    c.created_at,
    c.parent_id,
    c.depth,
    c.reply_count,
    EXISTS (
      SELECT 1 
      FROM headline_comments h
      WHERE h.headline_id = p_headline_id 
        AND h.parent_id IS NULL
        AND h.created_at < v_min_root_date
    ) AS has_more
  FROM temp_all_comments c
  ORDER BY
    COALESCE(c.parent_id::text, c.id::text),
    CASE WHEN c.parent_id IS NULL THEN c.created_at END DESC NULLS LAST,
    CASE WHEN c.parent_id IS NOT NULL THEN c.created_at END ASC NULLS LAST;

  -- Clean up temp tables
  DROP TABLE temp_root_comments;
  DROP TABLE temp_all_comments;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(UUID, INT, TIMESTAMPTZ) TO public;