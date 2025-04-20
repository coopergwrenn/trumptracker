/*
  # Update Comments Pagination System

  1. Changes
    - Drops existing pagination functions
    - Creates new get_paginated_comments_v2 function with cursor-based pagination
    - Updates indexes for better performance
    - Ensures RLS policies exist

  2. New Features
    - Cursor-based pagination for better performance
    - Proper handling of threaded comments
    - Improved sorting of comments and replies
    - Has_more flag for pagination state

  3. Security
    - Maintains existing RLS policies
    - Public read access
    - Public insert access
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_paginated_comments(uuid, integer, integer);
DROP FUNCTION IF EXISTS get_paginated_comments(uuid, integer, timestamp with time zone);
DROP FUNCTION IF EXISTS get_paginated_comments_v2(uuid, integer, timestamp with time zone);

-- Create new paginated comments function with cursor-based pagination
CREATE OR REPLACE FUNCTION get_paginated_comments_v2(
  p_headline_id uuid,
  p_page_size integer DEFAULT 10,
  p_cursor timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  headline_id uuid,
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
    (
      SELECT 
        c.id,
        c.headline_id,
        c.comment_text,
        c.anonymous_name,
        c.created_at,
        c.parent_id,
        c.depth,
        c.reply_count,
        false as has_more
      FROM headline_comments c
      WHERE c.headline_id = p_headline_id 
        AND c.parent_id IS NULL
        AND (p_cursor IS NULL OR c.created_at < p_cursor)
      ORDER BY c.created_at DESC
      LIMIT p_page_size
    )
    
    UNION ALL
    
    -- Recursive case: replies
    SELECT 
      r.id,
      r.headline_id,
      r.comment_text,
      r.anonymous_name,
      r.created_at,
      r.parent_id,
      r.depth,
      r.reply_count,
      false as has_more
    FROM headline_comments r
    INNER JOIN thread_comments tc ON r.parent_id = tc.id
    WHERE r.depth <= 2
  )
  SELECT 
    tc.id,
    tc.headline_id,
    tc.comment_text,
    tc.anonymous_name,
    tc.created_at,
    tc.parent_id,
    tc.depth,
    tc.reply_count,
    (EXISTS (
      SELECT 1 
      FROM headline_comments c
      WHERE c.headline_id = p_headline_id 
        AND c.parent_id IS NULL
        AND c.created_at < (
          SELECT MIN(created_at) 
          FROM thread_comments 
          WHERE parent_id IS NULL
        )
    )) as has_more
  FROM thread_comments tc
  ORDER BY
    COALESCE(tc.parent_id::text, tc.id::text),
    CASE WHEN tc.parent_id IS NULL THEN tc.created_at END DESC NULLS LAST,
    CASE WHEN tc.parent_id IS NOT NULL THEN tc.created_at END ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2 TO public;
GRANT EXECUTE ON FUNCTION get_paginated_comments_v2 TO authenticated;

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_headline_comments_thread
ON headline_comments (headline_id, parent_id, created_at DESC)
WHERE parent_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_headline_comments_replies
ON headline_comments (parent_id, created_at ASC)
WHERE parent_id IS NOT NULL;

-- Ensure RLS policies exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'headline_comments' AND policyname = 'Anyone can read comments'
  ) THEN
    ALTER TABLE headline_comments ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Anyone can read comments"
      ON headline_comments
      FOR SELECT
      TO public
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'headline_comments' AND policyname = 'Anyone can insert comments'
  ) THEN
    CREATE POLICY "Anyone can insert comments"
      ON headline_comments
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;