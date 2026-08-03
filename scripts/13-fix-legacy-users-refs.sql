-- ============================================================
-- SIPCOT TRACK -- 13: Fix Legacy Users References
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Update security definer helper functions to use profiles instead of users
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_official_or_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('official', 'admin') AND status = 'active'
  );
$$;

-- 2. Re-create verification_queue view to use profiles instead of users
CREATE OR REPLACE VIEW public.verification_queue AS
SELECT
  r.id,
  r.industry_id,
  i.name                  AS industry_name,
  i.sector,
  i.allottee_code,
  p.id                    AS park_id,
  p.name                  AS park_name,
  p.district,
  r.month,
  r.year,
  -- Step 1
  r.investment_cr,
  r.turnover_cr,
  -- Step 2
  r.emp_male,
  r.emp_female,
  r.emp_contractual,
  r.emp_total,
  -- Step 3
  r.water_kld,
  r.water_alert,
  r.power_kwh,
  -- Step 4
  r.csr_spend_lakhs,
  r.csr_activity,
  r.csr_file_url,
  -- Workflow
  r.status,
  r.rejection_reason,
  r.submitted_at,
  r.verified_at,
  u.full_name             AS verified_by_name
FROM
  public.monthly_reports r
  JOIN public.industries  i ON i.id = r.industry_id
  JOIN public.parks       p ON p.id = i.park_id
  LEFT JOIN public.profiles u ON u.id = r.verified_by
ORDER BY
  -- Pending first, then by date descending
  CASE r.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
  r.submitted_at DESC;

-- 3. Update storage policies to reference profiles instead of users
DROP POLICY IF EXISTS "Admins can read all CSR docs" ON storage.objects;
CREATE POLICY "Admins can read all CSR docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'csr-documents' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'official') AND status = 'active')
  );
