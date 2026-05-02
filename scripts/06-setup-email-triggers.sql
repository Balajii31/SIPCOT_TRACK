-- ============================================================
-- SIPCOT TRACK -- Fix 06: Email Notification Webhooks (v2)
-- Run this in Supabase SQL Editor.
-- URLs are hardcoded directly -- no ALTER DATABASE needed.
-- ============================================================

-- Step 1: Enable pg_net extension (HTTP calls from triggers)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Helper function to call an edge function
CREATE OR REPLACE FUNCTION call_edge_function(url TEXT, payload JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url     := url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZmNxaGx0ZnNya3p5aXBvb2hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzczMzgsImV4cCI6MjA5MzA1MzMzOH0.a_9ZpMRFJrFMuWC39wRR9uZseU8kj70PpSvODvOz0Ac'
    ),
    body    := payload::text
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Edge function call failed for %: %', url, SQLERRM;
END;
$$;

-- Step 3: Trigger function -- status change (Verified / Rejected / Pending)
CREATE OR REPLACE FUNCTION trigger_notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_url TEXT := 'https://iafcqhltfsrkzyipooha.supabase.co/functions/v1/notify-status-change';
BEGIN
  -- Only fire when status actually changes
  IF (TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status) THEN
    RETURN NEW;
  END IF;

  PERFORM call_edge_function(
    edge_url,
    jsonb_build_object(
      'type',       TG_OP,
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     row_to_json(NEW)::jsonb,
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END
    )
  );

  RETURN NEW;
END;
$$;

-- Step 4: Trigger function -- resource alert (water > 1000 KLD)
CREATE OR REPLACE FUNCTION trigger_notify_resource_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_url  TEXT    := 'https://iafcqhltfsrkzyipooha.supabase.co/functions/v1/notify-water-alert';
  water_val NUMERIC := (NEW.water_kld)::NUMERIC;
  power_val NUMERIC := (NEW.power_kwh)::NUMERIC;
BEGIN
  IF water_val > 1000 OR power_val > 500000 THEN
    PERFORM call_edge_function(
      edge_url,
      jsonb_build_object(
        'type',   TG_OP,
        'table',  TG_TABLE_NAME,
        'record', row_to_json(NEW)::jsonb
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Step 5: Attach triggers to monthly_reports
DROP TRIGGER IF EXISTS on_report_status_change   ON monthly_reports;
DROP TRIGGER IF EXISTS on_report_resource_alert  ON monthly_reports;

-- Status change: fires on INSERT and UPDATE of status
CREATE TRIGGER on_report_status_change
  AFTER INSERT OR UPDATE OF status ON monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_status_change();

-- Resource alert: fires only on INSERT (new submission)
CREATE TRIGGER on_report_resource_alert
  AFTER INSERT ON monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_resource_alert();

-- Step 6: Verify triggers were created successfully
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'monthly_reports'
ORDER BY trigger_name;
