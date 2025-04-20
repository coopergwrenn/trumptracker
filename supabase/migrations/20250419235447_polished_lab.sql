/*
  # Fix comments system

  1. Changes
    - Restore original comments table structure
    - Remove problematic migrations
    - Restore original indexes and constraints
*/

-- Drop the simplified function
DROP FUNCTION IF EXISTS get_comments(uuid, integer, integer);

-- Restore the original table structure
ALTER TABLE headline_comments 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES headline_comments(id),
ADD COLUMN IF NOT EXISTS depth integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS reply_count integer NOT NULL DEFAULT 0;

-- Add back the original constraints
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'max_comment_depth'
  ) THEN
    ALTER TABLE headline_comments
    ADD CONSTRAINT max_comment_depth CHECK (depth <= 2);
  END IF;
END $$;

-- Restore original indexes
CREATE INDEX IF NOT EXISTS idx_headline_comments_thread
ON headline_comments (headline_id, parent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_headline_comments_replies
ON headline_comments (parent_id, created_at ASC)
WHERE parent_id IS NOT NULL;

-- Restore the original pagination function
CREATE OR REPLACE FUNCTION get_paginated_comments_v2(
  p_headline_id uuid,
  p_limit integer DEFAULT 10,
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
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE thread_comments AS (
    -- Base case: root comments
    SELECT 
      c.id,
      c.comment_text,
      c.anonymous_name,
      c.created_at,
      c.parent_id,
      c.depth,
      c.reply_count,
      array[c.created_at] as sort_path
    FROM headline_comments c
    WHERE c.headline_id = p_headline_id 
      AND c.parent_id IS NULL
      AND (p_cursor IS NULL OR c.created_at < p_cursor)
    
    UNION ALL
    
    -- Recursive case: replies
    SELECT 
      c.id,
      c.comment_text,
      c.anonymous_name,
      c.created_at,
      c.parent_id,
      c.depth,
      c.reply_count,
      tc.sort_path || c.created_at
    FROM headline_comments c
    JOIN thread_comments tc ON c.parent_id = tc.id
    WHERE c.depth <= 2
  )
  SELECT 
    tc.id,
    tc.comment_text,
    tc.anonymous_name,
    tc.created_at,
    tc.parent_id,
    tc.depth,
    tc.reply_count,
    EXISTS (
      SELECT 1 
      FROM headline_comments c
      WHERE c.headline_id = p_headline_id 
        AND c.parent_id IS NULL
        AND c.created_at < (
          SELECT MIN(created_at)
          FROM thread_comments
          WHERE parent_id IS NULL
        )
    ) as has_more
  FROM thread_comments tc
  ORDER BY
    COALESCE(tc.parent_id::text, tc.id::text),
    CASE WHEN tc.parent_id IS NULL THEN tc.created_at END DESC NULLS FIRST,
    CASE WHEN tc.parent_id IS NOT NULL THEN tc.created_at END ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(uuid, integer, timestamp with time zone) TO public;
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2(uuid, integer, timestamp with time zone) TO authenticated;