-- ============================================================
-- SIPCOT TRACK -- 10: Fix Email Linkage & Trigger Sync
-- ============================================================

-- 1. Enhanced trigger to link newly registered industries
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_industry_id UUID;
BEGIN
  -- Insert into profiles first
  INSERT INTO public.profiles (
    id, email, full_name, role, status, industry_name, allottee_code, 
    park_name, phone_number, designation, official_id, assigned_park, 
    reason_for_access, admin_level, hq_department
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'industry'),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'industry') = 'industry' THEN 'active'
      ELSE 'pending'
    END,
    NEW.raw_user_meta_data->>'industry_name',
    NEW.raw_user_meta_data->>'allottee_code',
    NEW.raw_user_meta_data->>'park_name',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'designation',
    NEW.raw_user_meta_data->>'official_id',
    NEW.raw_user_meta_data->>'assigned_park',
    NEW.raw_user_meta_data->>'reason_for_access',
    NEW.raw_user_meta_data->>'admin_level',
    NEW.raw_user_meta_data->>'hq_department'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  -- 2. AUTO-LINK: If industry, find by code and link back
  IF (NEW.raw_user_meta_data->>'role' = 'industry' AND NEW.raw_user_meta_data->>'allottee_code' IS NOT NULL) THEN
    UPDATE public.industries
    SET 
      user_id = NEW.id,
      contact_email = NEW.email, -- Use the registered real email
      contact_phone = COALESCE(NEW.raw_user_meta_data->>'phone_number', contact_phone)
    WHERE allottee_code = NEW.raw_user_meta_data->>'allottee_code';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Ensure industries table has the correct index for fast lookup
CREATE INDEX IF NOT EXISTS idx_industries_allottee_code ON public.industries(allottee_code);

-- 3. FORCE SYNC: Update ALL linked industries to match their profile email
UPDATE public.industries i
SET contact_email = p.email
FROM public.profiles p
WHERE i.user_id = p.id
AND i.contact_email IS DISTINCT FROM p.email;
