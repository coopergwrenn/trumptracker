/*
  # Fix user creation trigger function

  1. Changes
    - Implement handle_new_user trigger function to:
      - Create user_subscriptions record for new users
      - Set up trial period
    - Add trigger to auth.users table
  
  2. Security
    - Function executes with security definer to ensure proper permissions
*/

-- Implement the handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create a subscription record for the new user
  INSERT INTO public.user_subscriptions (
    user_id,
    trial_start,
    trial_end,
    is_active,
    subscription_status
  ) VALUES (
    NEW.id,
    now(),
    now() + interval '7 days',
    true,
    'trialing'
  );
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists on the auth.users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;