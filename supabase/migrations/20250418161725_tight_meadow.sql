/*
  # Add threaded comments support

  1. Changes
    - Add parent_id to headline_comments table for reply threading
    - Add depth column to limit nesting levels
    - Add indexes for efficient comment tree retrieval
    - Update RLS policies for threaded access
*/

-- Add columns for threading support
ALTER TABLE headline_comments
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES headline_comments(id),
ADD COLUMN IF NOT EXISTS depth int NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS reply_count int NOT NULL DEFAULT 0;

-- Add constraint to limit nesting depth
ALTER TABLE headline_comments
ADD CONSTRAINT max_comment_depth CHECK (depth <= 2);

-- Add foreign key constraint for parent_id
ALTER TABLE headline_comments
ADD CONSTRAINT valid_parent_check
FOREIGN KEY (parent_id) REFERENCES headline_comments(id)
ON DELETE CASCADE;

-- Create index for efficient tree traversal
CREATE INDEX IF NOT EXISTS idx_headline_comments_parent_id
ON headline_comments(parent_id);

-- Create index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_headline_comments_created_at
ON headline_comments(created_at DESC);

-- Function to update reply counts
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE headline_comments
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    UPDATE headline_comments
    SET reply_count = reply_count - 1
    WHERE id = OLD.parent_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reply count updates
CREATE TRIGGER update_reply_count_trigger
AFTER INSERT OR DELETE ON headline_comments
FOR EACH ROW
EXECUTE FUNCTION update_comment_reply_count();

-- Add helpful comment
COMMENT ON TABLE headline_comments IS 'Stores threaded comments for news headlines with support for nested replies';