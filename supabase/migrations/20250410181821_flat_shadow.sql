/*
  # Create news headlines table

  1. New Tables
    - `news_headlines`
      - `id` (uuid, primary key)
      - `original_title` (text, not null)
      - `neutral_title` (text, nullable)
      - `original_description` (text, nullable)
      - `neutral_description` (text, nullable)
      - `url` (text, unique, not null)
      - `published_at` (timestamptz, not null)
      - `source_name` (text, not null)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `news_headlines` table
    - Add policy for authenticated users to read headlines
*/

-- Create the news_headlines table
CREATE TABLE IF NOT EXISTS news_headlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_title text NOT NULL,
  neutral_title text,
  original_description text,
  neutral_description text,
  url text UNIQUE NOT NULL,
  published_at timestamptz NOT NULL,
  source_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE news_headlines ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read headlines (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'news_headlines'
    AND policyname = 'Authenticated users can read headlines'
  ) THEN
    CREATE POLICY "Authenticated users can read headlines"
      ON news_headlines
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- Create updated_at trigger (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_news_headlines_updated_at'
  ) THEN
    CREATE TRIGGER update_news_headlines_updated_at
      BEFORE UPDATE ON news_headlines
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;