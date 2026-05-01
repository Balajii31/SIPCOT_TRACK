-- ============================================================
-- SIPCOT TRACK — Fix 06: Email Notification Webhooks
-- Run this in Supabase SQL Editor → Run.
-- Requires: pg_net extension + Edge Functions deployed.
-- ============================================================

-- ── Step 1: Enable pg_net (HTTP calls from triggers) ──────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Step 2: Store Edge Function URLs as settings ─────────────────────────────
-- Replace YOUR-PROJECT-REF with your actual Supabase project ref.
-- You can find it in: Supabase Dashboard → Project Settings → API → Reference ID
DO $$
BEGIN
  EXECUTE format(
    'ALTER DATABASE postgres SET app.edge_status_url = %L',
    'https://YOUR-PROJECT-REF.supabase.co/functions/v1/notify-status-change'
  );
  EXECUTE format(
    'ALTER DATABASE postgres SET app.edge_alert_url = %L',
    'https://YOUR-PROJECT-REF.supabase.co/functions/v1/notify-water-alert'
  );
  EXECUTE format(
    'ALTER DATABASE postgres SET app.edge_secret = %L',
    'YOUR-SUPABASE-ANON-KEY'
  );
END $$;

-- ── Step 3: Helper function to call an edge function ─────────────────────────
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
      'Authorization', 'Bearer ' || current_setting('app.edge_secret', true)
    ),
    body    := payload::text
  );
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block the DB transaction
  RAISE WARNING 'Edge function call failed for %: %', url, SQLERRM;
END;
$$;

-- ── Step 4: Trigger function — status change on monthly_reports ───────────────
CREATE OR REPLACE FUNCTION trigger_notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_url TEXT := current_setting('app.edge_status_url', true);
BEGIN
  -- Only fire when status actually changes (INSERT or status UPDATE)
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

-- ── Step 5: Trigger function — water/power alert on INSERT ────────────────────
CREATE OR REPLACE FUNCTION trigger_notify_resource_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_url  TEXT    := current_setting('app.edge_alert_url', true);
  water_val NUMERIC := (NEW.water_kld)::NUMERIC;
  power_val NUMERIC := (NEW.power_kwh)::NUMERIC;
BEGIN
  -- Only alert when thresholds exceeded
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

-- ── Step 6: Attach triggers to monthly_reports ────────────────────────────────
-- Drop existing first to avoid duplicates
DROP TRIGGER IF EXISTS on_report_status_change ON monthly_reports;
DROP TRIGGER IF EXISTS on_report_resource_alert ON monthly_reports;

-- Status change: fires on INSERT and UPDATE
CREATE TRIGGER on_report_status_change
  AFTER INSERT OR UPDATE OF status ON monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_status_change();

-- Resource alert: fires only on INSERT (new submission)
CREATE TRIGGER on_report_resource_alert
  AFTER INSERT ON monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notify_resource_alert();

-- ── Step 7: Verify triggers created ──────────────────────────────────────────
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'monthly_reports'
ORDER BY trigger_name;
