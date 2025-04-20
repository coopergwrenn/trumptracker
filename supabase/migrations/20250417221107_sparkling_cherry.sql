/*
  # Add X API token cache table

  1. New Tables
    - `x_api_tokens`: Stores cached X API tokens
      - `id` (uuid, primary key)
      - `access_token` (text)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policy for service role access only
*/

CREATE TABLE IF NOT EXISTS x_api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE x_api_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for service role only
CREATE POLICY "Service role can manage tokens"
  ON x_api_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for faster expiration checks
CREATE INDEX idx_x_api_tokens_expires_at 
ON x_api_tokens(expires_at);

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_x_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM x_api_tokens
  WHERE expires_at < NOW();
END;
$$;

-- Add helpful comment
COMMENT ON TABLE x_api_tokens IS 'Stores cached X API access tokens';