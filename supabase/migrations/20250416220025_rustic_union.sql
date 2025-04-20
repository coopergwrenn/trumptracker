-- Drop existing function to recreate with better error handling
DROP FUNCTION IF EXISTS get_shared_article(uuid);

-- Create improved function with better error handling
CREATE OR REPLACE FUNCTION get_shared_article(article_id uuid)
RETURNS SETOF news_headlines
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM news_headlines
  WHERE id = article_id
  AND neutralization_status = 'completed';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_shared_article(uuid) TO public;
GRANT EXECUTE ON FUNCTION get_shared_article(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_shared_article(uuid) IS 'Securely retrieves a complete shared article by ID';