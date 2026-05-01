-- ============================================================
-- SIPCOT TRACK — Fix 03: RLS Policies (Safe, No Recursion)
-- Paste this entire file into Supabase SQL Editor and run it.
-- ============================================================

-- ── Step 1: Drop all old recursive policies ───────────────────────────────────

DROP POLICY IF EXISTS "Admins can read all users"                         ON public.users;
DROP POLICY IF EXISTS "Admins can update any user"                        ON public.users;
DROP POLICY IF EXISTS "Admins can manage industries"                      ON public.industries;
DROP POLICY IF EXISTS "Industries can be read by all authenticated users" ON public.industries;
DROP POLICY IF EXISTS "Industry users can read their own record"          ON public.industries;
DROP POLICY IF EXISTS "Officials and admins can read all reports"         ON public.monthly_reports;
DROP POLICY IF EXISTS "Officials and admins can update report status"     ON public.monthly_reports;
DROP POLICY IF EXISTS "Industry users can read their own reports"         ON public.monthly_reports;
DROP POLICY IF EXISTS "Industry users can insert their own reports"       ON public.monthly_reports;
DROP POLICY IF EXISTS "Industry users can update their own pending reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Admins can manage parks"                           ON public.parks;
DROP POLICY IF EXISTS "Parks are readable by all authenticated users"     ON public.parks;
DROP POLICY IF EXISTS "Admins can read audit logs"                        ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs"                      ON public.audit_logs;

-- ── Step 2: Create SECURITY DEFINER helper functions (no recursion) ───────────

-- Returns true if the current user is an admin (uses SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Returns true if the current user is an official or admin
CREATE OR REPLACE FUNCTION public.is_official_or_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('official', 'admin')
  );
$$;

-- ── Step 3: USERS table — safe policies ──────────────────────────────────────

-- Own row always readable
CREATE POLICY "Users can read own row"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all (safe: is_admin() uses SECURITY DEFINER, no recursion)
CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (public.is_admin());

-- Own row updatable
CREATE POLICY "Users can update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Admins can update any row
CREATE POLICY "Admins can update any user"
  ON public.users FOR UPDATE
  USING (public.is_admin());

-- ── Step 4: PARKS table ───────────────────────────────────────────────────────

-- Anyone (even anon) can read active parks — needed for map
CREATE POLICY "Public read active parks"
  ON public.parks FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

-- Only admins can create/update/delete parks
CREATE POLICY "Admins can manage parks"
  ON public.parks FOR ALL
  USING (public.is_admin());

-- ── Step 5: INDUSTRIES table ──────────────────────────────────────────────────

-- Anyone can read active industries (needed for allottee form dropdown)
CREATE POLICY "Public read active industries"
  ON public.industries FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

-- Only admins can manage industries
CREATE POLICY "Admins can manage industries"
  ON public.industries FOR ALL
  USING (public.is_admin());

-- ── Step 6: MONTHLY_REPORTS table ────────────────────────────────────────────

-- Industry users can read their own reports
CREATE POLICY "Industry users read own reports"
  ON public.monthly_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.industries
      WHERE id = monthly_reports.industry_id
        AND user_id = auth.uid()
    )
  );

-- Officials and admins can read all reports
CREATE POLICY "Officials and admins read all reports"
  ON public.monthly_reports FOR SELECT
  USING (public.is_official_or_admin());

-- Industry users can submit new reports
CREATE POLICY "Industry users insert own reports"
  ON public.monthly_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.industries
      WHERE id = monthly_reports.industry_id
        AND user_id = auth.uid()
    )
  );

-- Industry users can update their own pending reports
CREATE POLICY "Industry users update own pending reports"
  ON public.monthly_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.industries
      WHERE id = monthly_reports.industry_id
        AND user_id = auth.uid()
    )
    AND status = 'pending'
  );

-- Officials and admins can approve/reject (update status)
CREATE POLICY "Officials and admins update report status"
  ON public.monthly_reports FOR UPDATE
  USING (public.is_official_or_admin());

-- ── Step 7: AUDIT LOGS table ──────────────────────────────────────────────────

CREATE POLICY "Admins read audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Authenticated insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- ── Step 8: Grant view access ─────────────────────────────────────────────────

GRANT SELECT ON public.park_summary        TO anon, authenticated;
GRANT SELECT ON public.verification_queue  TO authenticated;

-- ── Done ──────────────────────────────────────────────────────────────────────
-- You should see "Success. No rows returned." after running this.
