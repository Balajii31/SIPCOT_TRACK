-- ============================================================
-- SIPCOT TRACK -- 09: Smart Registration Schema
-- ============================================================

-- Update profiles table with expanded fields for all roles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number        TEXT,
ADD COLUMN IF NOT EXISTS park_name           TEXT,
ADD COLUMN IF NOT EXISTS designation         TEXT,
ADD COLUMN IF NOT EXISTS official_id         TEXT,
ADD COLUMN IF NOT EXISTS assigned_park       TEXT,
ADD COLUMN IF NOT EXISTS reason_for_access   TEXT,
ADD COLUMN IF NOT EXISTS admin_level         TEXT,
ADD COLUMN IF NOT EXISTS hq_department       TEXT;

-- Update the trigger function to map all metadata from auth.users.raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    status,
    industry_name,
    allottee_code,
    park_name,
    phone_number,
    designation,
    official_id,
    assigned_park,
    reason_for_access,
    admin_level,
    hq_department
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
    email             = EXCLUDED.email,
    full_name         = EXCLUDED.full_name,
    role              = EXCLUDED.role,
    industry_name     = EXCLUDED.industry_name,
    allottee_code     = EXCLUDED.allottee_code,
    park_name         = EXCLUDED.park_name,
    phone_number      = EXCLUDED.phone_number,
    designation       = EXCLUDED.designation,
    official_id       = EXCLUDED.official_id,
    assigned_park     = EXCLUDED.assigned_park,
    reason_for_access = EXCLUDED.reason_for_access,
    admin_level       = EXCLUDED.admin_level,
    hq_department     = EXCLUDED.hq_department,
    updated_at        = NOW();

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
