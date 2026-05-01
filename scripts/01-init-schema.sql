-- ============================================================
-- SIPCOT TRACK — Complete Database Schema
-- Government of Tamil Nadu
-- Tables: parks, industries, monthly_reports, users, audit_logs
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS TABLE (Auth + Role Management)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'industry'
                CHECK (role IN ('industry', 'official', 'admin')),
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any user"
  ON public.users FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 2. PARKS TABLE (SIPCOT Industrial Parks)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.parks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  district        TEXT NOT NULL,
  state           TEXT NOT NULL DEFAULT 'Tamil Nadu',
  -- Geographic coordinates for the map
  latitude        NUMERIC(10, 7) NOT NULL,
  longitude       NUMERIC(10, 7) NOT NULL,
  -- Aggregate stats (updated by trigger/function)
  total_area_acres NUMERIC(10, 2),
  established_year INTEGER,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.parks ENABLE ROW LEVEL SECURITY;

-- Parks are publicly readable (for map display)
CREATE POLICY "Parks are readable by all authenticated users"
  ON public.parks FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Admins can manage parks"
  ON public.parks FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. INDUSTRIES TABLE (Allottees within Parks)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.industries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  park_id         UUID NOT NULL REFERENCES public.parks(id) ON DELETE RESTRICT,
  -- Company details
  name            TEXT NOT NULL,
  sector          TEXT NOT NULL,
  allottee_code   TEXT UNIQUE,           -- Official SIPCOT allottee reference code
  contact_person  TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  address         TEXT,
  established_year INTEGER,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Industries can be read by all authenticated users"
  ON public.industries FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Industry users can read their own record"
  ON public.industries FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage industries"
  ON public.industries FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 4. MONTHLY REPORTS TABLE
--    Matches SIPCOT TRACK stepper form exactly:
--    Step 1: Investment & Turnover
--    Step 2: Employment (Male, Female, Contractual)
--    Step 3: Utilities (Water KLD, Power kWh)
--    Step 4: CSR (Spend Lakhs, Activity, File)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  industry_id         UUID NOT NULL REFERENCES public.industries(id) ON DELETE CASCADE,
  submitted_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Reporting period
  month               INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year                INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),

  -- Step 1: Investment & Turnover (in ₹ Crore)
  investment_cr       NUMERIC(15, 2),
  turnover_cr         NUMERIC(15, 2),

  -- Step 2: Employment
  emp_male            INTEGER DEFAULT 0 CHECK (emp_male >= 0),
  emp_female          INTEGER DEFAULT 0 CHECK (emp_female >= 0),
  emp_contractual     INTEGER DEFAULT 0 CHECK (emp_contractual >= 0),
  -- Computed column via trigger
  emp_total           INTEGER GENERATED ALWAYS AS (emp_male + emp_female + emp_contractual) STORED,

  -- Step 3: Utilities
  water_kld           NUMERIC(10, 2),   -- Kilolitres per Day
  power_kwh           NUMERIC(15, 2),   -- Kilowatt-hours

  -- Step 4: CSR
  csr_spend_lakhs     NUMERIC(12, 2),   -- ₹ Lakhs
  csr_activity        TEXT,             -- Description of CSR activity
  csr_file_url        TEXT,             -- URL of uploaded photo/PDF in Supabase Storage

  -- Workflow status
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason    TEXT,             -- Filled when admin rejects
  verified_by         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  verified_at         TIMESTAMP WITH TIME ZONE,

  -- Flags
  water_alert         BOOLEAN GENERATED ALWAYS AS (water_kld > 1000) STORED,

  submitted_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One report per industry per month
  UNIQUE (industry_id, month, year)
);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Industry users can read their own reports"
  ON public.monthly_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.industries
      WHERE id = industry_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Industry users can insert their own reports"
  ON public.monthly_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.industries
      WHERE id = industry_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Industry users can update their own pending reports"
  ON public.monthly_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.industries
      WHERE id = industry_id AND user_id = auth.uid()
    )
    AND status = 'pending'
  );

CREATE POLICY "Officials and admins can read all reports"
  ON public.monthly_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('official', 'admin')
    )
  );

CREATE POLICY "Officials and admins can update report status"
  ON public.monthly_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('official', 'admin')
    )
  );

-- ============================================================
-- 5. AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,   -- e.g. 'report.submitted', 'report.approved', 'user.created'
  entity_type TEXT,            -- e.g. 'monthly_report', 'industry', 'park'
  entity_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- ============================================================
-- 6. INDEXES (Performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_role           ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status         ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_industries_park_id   ON public.industries(park_id);
CREATE INDEX IF NOT EXISTS idx_industries_user_id   ON public.industries(user_id);
CREATE INDEX IF NOT EXISTS idx_industries_sector    ON public.industries(sector);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_industry  ON public.monthly_reports(industry_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_period    ON public.monthly_reports(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_status    ON public.monthly_reports(status);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_water_alert ON public.monthly_reports(water_alert);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id   ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity    ON public.audit_logs(entity_type, entity_id);

-- ============================================================
-- 7. TRIGGERS (auto-update updated_at)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_parks_updated_at
  BEFORE UPDATE ON public.parks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_industries_updated_at
  BEFORE UPDATE ON public.industries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_monthly_reports_updated_at
  BEFORE UPDATE ON public.monthly_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 8. SEED DATA — SIPCOT Parks (Tamil Nadu)
-- ============================================================
INSERT INTO public.parks (name, district, latitude, longitude, total_area_acres, established_year) VALUES
  ('Hosur Industrial Estate I',       'Krishnagiri',  12.7409,  77.8253,  1200, 1973),
  ('Hosur Industrial Estate II',      'Krishnagiri',  12.7209,  77.8353,   800, 1985),
  ('Sriperumbudur Industrial Park',   'Kancheepuram', 12.9694,  79.9481,  2400, 1994),
  ('Oragadam Industrial Corridor',    'Kancheepuram', 12.8230,  79.9866,  1800, 2008),
  ('Coimbatore SIDCO Estate',         'Coimbatore',   11.0168,  76.9558,   650, 1978),
  ('Madurai Industrial Estate',       'Madurai',       9.9252,  78.1198,   420, 1980),
  ('SIPCOT Gummidipoondi',            'Thiruvallur',  13.4070,  80.1195,   900, 1988),
  ('Ranipet Industrial Park',         'Ranipet',      12.9298,  79.3334,   550, 1982),
  ('Cuddalore SIPCOT Complex',        'Cuddalore',    11.7447,  79.7681,  1600, 1975),
  ('SIPCOT Perundurai',               'Erode',        11.2762,  77.5806,   750, 2002)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. SUPABASE STORAGE BUCKET (run separately in dashboard)
-- ============================================================
-- Create a storage bucket named 'csr-documents' for CSR file uploads.
-- Set it to private with authenticated access.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('csr-documents', 'csr-documents', false);
