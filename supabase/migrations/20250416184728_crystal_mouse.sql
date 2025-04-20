/*
  # Update views for shared articles

  1. Changes
    - Create view for public article access
    - Add security definer function for fetching shared articles
    - Optimize query performance
*/

-- Create a secure view for public article access
CREATE OR REPLACE VIEW public_news_headlines
WITH (security_invoker = true)
AS
SELECT
  id,
  neutral_title,
  neutral_description,
  url,
  published_at,
  source_name,
  created_at
FROM news_headlines
WHERE neutralization_status = 'completed';

-- Grant access to the view
GRANT SELECT ON public_news_headlines TO public;
GRANT SELECT ON public_news_headlines TO authenticated;

-- Create a function to fetch a single shared article
CREATE OR REPLACE FUNCTION get_shared_article(article_id uuid)
RETURNS TABLE (
  id uuid,
  neutral_title text,
  neutral_description text,
  url text,
  published_at timestamptz,
  source_name text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    neutral_title,
    neutral_description,
    url,
    published_at,
    source_name,
    created_at
  FROM news_headlines
  WHERE id = article_id
  AND neutralization_status = 'completed'
  LIMIT 1;
$$;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION get_shared_article(uuid) TO public;
GRANT EXECUTE ON FUNCTION get_shared_article(uuid) TO authenticated;