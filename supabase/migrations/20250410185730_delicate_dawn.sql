/*
  # Update news headlines policies and functions

  1. Security
    - Add RLS policy for inserting news headlines
    - Add policy for the edge function to manage headlines
  
  2. Changes
    - Create security definer function for news management
    - Update existing RLS policies
*/

-- Create a security definer function for managing news
CREATE OR REPLACE FUNCTION manage_news_headlines(
  p_title text,
  p_neutral_title text,
  p_description text,
  p_neutral_description text,
  p_url text,
  p_published_at timestamptz,
  p_source_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO news_headlines (
    original_title,
    neutral_title,
    original_description,
    neutral_description,
    url,
    published_at,
    source_name
  ) VALUES (
    p_title,
    p_neutral_title,
    p_description,
    p_neutral_description,
    p_url,
    p_published_at,
    p_source_name
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Update RLS policies
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Authenticated users can read headlines" ON news_headlines;
  DROP POLICY IF EXISTS "Service role can manage headlines" ON news_headlines;
  
  -- Create new policies
  CREATE POLICY "Authenticated users can read headlines"
    ON news_headlines
    FOR SELECT
    TO authenticated
    USING (true);
    
  CREATE POLICY "Service role can manage headlines"
    ON news_headlines
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
END
$$;