-- ============================================================
-- SIPCOT TRACK -- 12: Custom Form Builder Database Schema
-- ============================================================

-- Step 1: Create custom_forms table
CREATE TABLE IF NOT EXISTS public.custom_forms (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  description   TEXT,
  schema        JSONB NOT NULL, -- Array of field definitions
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create custom_form_submissions table
CREATE TABLE IF NOT EXISTS public.custom_form_submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id       UUID NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
  industry_id   UUID NOT NULL REFERENCES public.industries(id) ON DELETE CASCADE,
  responses     JSONB NOT NULL, -- Key-value response map
  submitted_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Enable RLS on both tables
ALTER TABLE public.custom_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_form_submissions ENABLE ROW LEVEL SECURITY;

-- Step 4: Define RLS policies for custom_forms
DROP POLICY IF EXISTS "Allow authenticated users to read active custom forms" ON public.custom_forms;
CREATE POLICY "Allow authenticated users to read active custom forms"
  ON public.custom_forms FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Allow admins to manage custom forms" ON public.custom_forms;
CREATE POLICY "Allow admins to manage custom forms"
  ON public.custom_forms FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Step 5: Define RLS policies for custom_form_submissions
DROP POLICY IF EXISTS "Allow industry users to insert submissions" ON public.custom_form_submissions;
CREATE POLICY "Allow industry users to insert submissions"
  ON public.custom_form_submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'industry'
    )
  );

DROP POLICY IF EXISTS "Allow users to read their own or all submissions" ON public.custom_form_submissions;
CREATE POLICY "Allow users to read their own or all submissions"
  ON public.custom_form_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND (
        (p.role = 'industry' AND custom_form_submissions.submitted_by = p.id) OR
        (p.role IN ('admin', 'official'))
      )
    )
  );

-- Step 6: Create or update view for industry_profiles to fix dashboard errors
CREATE OR REPLACE VIEW public.industry_profiles AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  COALESCE(p.industry_name, i.name) AS company_name,
  COALESCE(i.sector, 'Not Specified') AS sector,
  COALESCE(p.park_name, pk.name) AS location,
  p.role,
  p.status,
  p.id AS user_id
FROM public.profiles p
LEFT JOIN public.industries i ON i.user_id = p.id
LEFT JOIN public.parks pk ON i.park_id = pk.id
WHERE p.role = 'industry';

-- Step 7: Grant SELECT on industry_profiles view to all authenticated users
GRANT SELECT ON public.industry_profiles TO authenticated;
GRANT SELECT ON public.custom_forms TO authenticated;
GRANT SELECT, INSERT ON public.custom_form_submissions TO authenticated;
