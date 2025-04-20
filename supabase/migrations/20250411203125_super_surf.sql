/*
  # Add Stripe webhook secret

  1. Changes
    - Add comment explaining the manual step required
    - Provide instructions for setting up webhook secret
*/

-- NOTE: The Stripe webhook secret must be set manually in the Supabase Dashboard
-- under Project Settings > Edge Functions > Environment Variables
-- Add: STRIPE_WEBHOOK_SECRET=whsec_Jv09NcUmgKzRsBFd8enfH1CBqmDjnesw

-- This migration serves as documentation of the required manual step
-- No SQL changes needed as environment variables are managed through the Supabase Dashboard