-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_comments;

-- Create index for better performance
DROP INDEX IF EXISTS idx_headline_comments_headline_created;
CREATE INDEX idx_headline_comments_headline_created 
ON headline_comments(headline_id, created_at DESC);

-- Add constraint for non-empty comments if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'headline_comments' AND constraint_name = 'comment_text_not_empty'
  ) THEN
    ALTER TABLE headline_comments
    ADD CONSTRAINT comment_text_not_empty CHECK (length(TRIM(BOTH FROM comment_text)) > 0);
  END IF;
END $$;

-- Ensure RLS policies exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'headline_comments' AND policyname = 'Anyone can read comments'
  ) THEN
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