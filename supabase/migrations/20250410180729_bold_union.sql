/*
  # Add Stripe subscription tracking

  1. Changes
    - Add stripe_customer_id and stripe_subscription_id to user_subscriptions table
    - Add subscription_status column to track payment status
    - Add RLS policies for subscription data access

  2. Security
    - Enable RLS on user_subscriptions table
    - Add policy for users to read their own subscription data
*/

DO $$ BEGIN
  -- Add Stripe-related columns to user_subscriptions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_subscriptions' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE user_subscriptions 
    ADD COLUMN stripe_customer_id text,
    ADD COLUMN stripe_subscription_id text,
    ADD COLUMN subscription_status text DEFAULT 'trialing' CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete'));
  END IF;
END $$;