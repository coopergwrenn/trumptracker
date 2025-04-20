/*
  # Fix Comments Pagination Column Ambiguity

  1. Changes
    - Drops existing pagination functions
    - Creates new get_paginated_comments_v2 function with explicit column references
    - Adds proper table aliases throughout the queries
    - Fixes ambiguous created_at references

  2. Improvements
    - All column references are now fully qualified
    - Clear naming for recursive CTE
    - Explicit ordering with qualified columns
    - Proper null handling in sort conditions

  3. Security
    - Maintains existing RLS policies
    - Preserves public access grants
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_paginated_comments(uuid, integer, integer);
DROP FUNCTION IF EXISTS get_paginated_comments(uuid, integer, timestamp with time zone);
DROP FUNCTION IF EXISTS get_paginated_comments_v2(uuid, integer, timestamp with time zone);

-- Create new paginated comments function with explicit column references
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
DECLARE
  v_min_root_date timestamptz;
BEGIN
  -- First get root comments
  WITH RECURSIVE comment_tree AS (
    -- Base case: root comments with explicit column references
    (
      SELECT 
        root.id,
        root.headline_id,
        root.comment_text,
        root.anonymous_name,
        root.created_at AS comment_created_at,
        root.parent_id,
        root.depth,
        root.reply_count,
        false AS has_more
      FROM headline_comments root
      WHERE root.headline_id = p_headline_id 
        AND root.parent_id IS NULL
        AND (p_cursor IS NULL OR root.created_at < p_cursor)
      ORDER BY root.created_at DESC
      LIMIT p_page_size
    )
    
    UNION ALL
    
    -- Recursive case: replies with explicit column references
    SELECT 
      reply.id,
      reply.headline_id,
      reply.comment_text,
      reply.anonymous_name,
      reply.created_at AS comment_created_at,
      reply.parent_id,
      reply.depth,
      reply.reply_count,
      false AS has_more
    FROM headline_comments reply
    INNER JOIN comment_tree parent ON reply.parent_id = parent.id
    WHERE reply.depth <= 2
  )
  -- Store the minimum root comment date for pagination
  SELECT MIN(ct.comment_created_at)
  INTO v_min_root_date
  FROM comment_tree ct
  WHERE ct.parent_id IS NULL;

  -- Return final result with has_more flag
  RETURN QUERY
  SELECT 
    ct.id,
    ct.headline_id,
    ct.comment_text,
    ct.anonymous_name,
    ct.comment_created_at AS created_at,
    ct.parent_id,
    ct.depth,
    ct.reply_count,
    -- Check if more root comments exist
    EXISTS (
      SELECT 1 
      FROM headline_comments hc
      WHERE hc.headline_id = p_headline_id 
        AND hc.parent_id IS NULL
        AND hc.created_at < v_min_root_date
    ) AS has_more
  FROM comment_tree ct
  ORDER BY
    -- Sort by parent_id for grouping, using id as fallback
    COALESCE(ct.parent_id::text, ct.id::text),
    -- Sort root comments by date descending
    CASE 
      WHEN ct.parent_id IS NULL THEN ct.comment_created_at 
    END DESC NULLS LAST,
    -- Sort replies by date ascending
    CASE 
      WHEN ct.parent_id IS NOT NULL THEN ct.comment_created_at 
    END ASC NULLS LAST;
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