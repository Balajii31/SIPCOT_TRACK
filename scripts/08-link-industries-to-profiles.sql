-- ============================================================
-- SIPCOT TRACK -- Fix 08: Link Industries to Profiles
-- ============================================================

-- 1. Update industries table to reference public.profiles instead of public.users
ALTER TABLE public.industries DROP CONSTRAINT IF EXISTS industries_user_id_fkey;
ALTER TABLE public.industries ADD CONSTRAINT industries_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Update monthly_reports to reference public.profiles for auditors
ALTER TABLE public.monthly_reports DROP CONSTRAINT IF EXISTS monthly_reports_submitted_by_fkey;
ALTER TABLE public.monthly_reports ADD CONSTRAINT monthly_reports_submitted_by_fkey 
  FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.monthly_reports DROP CONSTRAINT IF EXISTS monthly_reports_verified_by_fkey;
ALTER TABLE public.monthly_reports ADD CONSTRAINT monthly_reports_verified_by_fkey 
  FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Sync existing demo users to the industries table
-- Link industry@sipcot.demo (c08e23c8-d3bc-4213-b08d-4bec7ab7deab) to TVS Motors
UPDATE public.industries 
SET user_id = 'c08e23c8-d3bc-4213-b08d-4bec7ab7deab' 
WHERE name = 'TVS Motors';

-- Verify
SELECT id, name, user_id FROM public.industries WHERE user_id IS NOT NULL;
