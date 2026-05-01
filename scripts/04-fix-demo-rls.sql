-- ============================================================
-- SIPCOT TRACK — Fix 04: Allow Demo/Anon inserts to monthly_reports
-- Run this in Supabase SQL Editor.
-- This allows unauthenticated demo submissions to work.
-- ============================================================

-- Drop the strict insert policy that requires user auth
DROP POLICY IF EXISTS "Industry users insert own reports"    ON public.monthly_reports;
DROP POLICY IF EXISTS "Industry users update own pending reports" ON public.monthly_reports;

-- Allow anon (demo mode) and authenticated users to insert reports
CREATE POLICY "Allow insert monthly reports"
  ON public.monthly_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

-- Allow anon (demo mode) and authenticated users to update (upsert)
CREATE POLICY "Allow update monthly reports"
  ON public.monthly_reports FOR UPDATE
  TO anon, authenticated
  USING (TRUE);

-- Also allow anon to read reports (for the verification queue demo)
DROP POLICY IF EXISTS "Industry users read own reports"     ON public.monthly_reports;
DROP POLICY IF EXISTS "Officials and admins read all reports" ON public.monthly_reports;

CREATE POLICY "Allow read monthly reports"
  ON public.monthly_reports FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- ── Done ────────────────────────────────────────────────────────────────────
-- You should see "Success. No rows returned."
-- Now try submitting the allottee form again.
