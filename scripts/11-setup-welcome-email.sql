-- ============================================================
-- SIPCOT TRACK -- 11: Welcome Email Trigger
-- ============================================================

-- Step 1: Trigger function for new user registration
CREATE OR REPLACE FUNCTION trigger_notify_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_url TEXT := 'https://iafcqhltfsrkzyipooha.supabase.co/functions/v1/notify-welcome';
BEGIN
  -- We use profiles table for this because handle_new_user() 
  -- ensures profiles are created immediately after auth.users
  
  PERFORM call_edge_function(
    edge_url,
    jsonb_build_object(
      'type',   TG_OP,
      'table',  TG_TABLE_NAME,
      'record', row_to_json(NEW)::jsonb
    )
  );

  RETURN NEW;
END;
$$;

-- Step 2: Attach trigger to profiles table
DROP TRIGGER IF EXISTS on_profile_created_welcome ON public.profiles;

CREATE TRIGGER on_profile_created_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_welcome();

-- Step 3: Verify trigger
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
AND trigger_name = 'on_profile_created_welcome';
