-- ============================================================
-- SIPCOT TRACK — Migration 02
-- Helper Views + Storage Bucket + Auth Hook
-- ============================================================

-- ============================================================
-- 1. VIEW: Park Summary (used by Admin Map Dashboard)
--    Aggregates latest monthly_report data per park
-- ============================================================
CREATE OR REPLACE VIEW public.park_summary AS
SELECT
  p.id                              AS park_id,
  p.name                            AS park_name,
  p.district,
  p.latitude,
  p.longitude,
  p.is_active,
  COUNT(DISTINCT i.id)              AS industry_count,
  COALESCE(SUM(r.investment_cr), 0) AS total_investment_cr,
  COALESCE(SUM(r.turnover_cr), 0)   AS total_turnover_cr,
  COALESCE(SUM(r.emp_total), 0)     AS total_jobs,
  COALESCE(SUM(r.water_kld), 0)     AS total_water_kld,
  COALESCE(SUM(r.power_kwh), 0)     AS total_power_kwh,
  COALESCE(SUM(r.csr_spend_lakhs), 0) AS total_csr_spend_lakhs,
  -- Alert flag: any industry in this park exceeds 1000 KLD
  BOOL_OR(r.water_alert)            AS has_water_alert,
  -- Count pending reports awaiting verification
  COUNT(CASE WHEN r.status = 'pending' THEN 1 END) AS pending_reports
FROM
  public.parks p
  LEFT JOIN public.industries i       ON i.park_id = p.id AND i.is_active = TRUE
  LEFT JOIN public.monthly_reports r  ON r.industry_id = i.id
    -- Only include the most recent submitted/approved report per industry
    AND (r.year, r.month) = (
      SELECT year, month FROM public.monthly_reports
      WHERE industry_id = i.id AND status IN ('pending', 'approved')
      ORDER BY year DESC, month DESC
      LIMIT 1
    )
WHERE
  p.is_active = TRUE
GROUP BY
  p.id, p.name, p.district, p.latitude, p.longitude, p.is_active;

-- ============================================================
-- 2. VIEW: Verification Queue (used by Admin Verify Page)
-- ============================================================
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
  LEFT JOIN public.users  u ON u.id = r.verified_by
ORDER BY
  -- Pending first, then by date descending
  CASE r.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
  r.submitted_at DESC;

-- ============================================================
-- 3. FUNCTION: Approve a report
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_report(
  p_report_id UUID,
  p_admin_id  UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.monthly_reports
  SET
    status      = 'approved',
    verified_by = p_admin_id,
    verified_at = NOW(),
    rejection_reason = NULL
  WHERE id = p_report_id AND status = 'pending';

  -- Log to audit
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
  VALUES (
    p_admin_id,
    'report.approved',
    'monthly_report',
    p_report_id,
    jsonb_build_object('status', 'approved', 'verified_at', NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. FUNCTION: Reject a report
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_report(
  p_report_id       UUID,
  p_admin_id        UUID,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.monthly_reports
  SET
    status           = 'rejected',
    verified_by      = p_admin_id,
    verified_at      = NOW(),
    rejection_reason = p_rejection_reason
  WHERE id = p_report_id AND status = 'pending';

  -- Log to audit
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
  VALUES (
    p_admin_id,
    'report.rejected',
    'monthly_report',
    p_report_id,
    jsonb_build_object('status', 'rejected', 'reason', p_rejection_reason, 'verified_at', NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. FUNCTION: Auto-create user profile on signup (Auth Hook)
--    Attach this in Supabase Dashboard → Authentication → Hooks
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'industry'),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 6. STORAGE BUCKET (run this in Supabase SQL Editor)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'csr-documents',
  'csr-documents',
  FALSE,
  10485760,  -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload CSR docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'csr-documents');

CREATE POLICY "Users can read own CSR docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'csr-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can read all CSR docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'csr-documents' AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'official'))
  );
