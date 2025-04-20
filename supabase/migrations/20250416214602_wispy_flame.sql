/*
  # Update article sharing function

  1. Changes
    - Drop existing function
    - Recreate function with updated return type
    - Add original title/description fields
    - Maintain security settings
    
  2. Security
    - Uses security definer
    - Restricts to completed articles only
    - Grants appropriate permissions
*/

-- First drop the existing function
DROP FUNCTION IF EXISTS get_shared_article(uuid);

-- Create the updated function
CREATE OR REPLACE FUNCTION get_shared_article(article_id uuid)
RETURNS TABLE (
  id uuid,
  original_title text,
  neutral_title text,
  original_description text,
  neutral_description text,
  url text,
  published_at timestamptz,
  source_name text,
  created_at timestamptz,
  neutralization_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.original_title,
    h.neutral_title,
    h.original_description,
    h.neutral_description,
    h.url,
    h.published_at,
    h.source_name,
    h.created_at,
    h.neutralization_status
  FROM news_headlines h
  WHERE h.id = article_id
  AND h.neutralization_status = 'completed'
  LIMIT 1;
END;
$$;

-- Grant execute permission to public and authenticated users
GRANT EXECUTE ON FUNCTION get_shared_article(uuid) TO public;
GRANT EXECUTE ON FUNCTION get_shared_article(uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_shared_article(uuid) IS 'Securely retrieves a shared article by ID, ensuring only completed articles are accessible';