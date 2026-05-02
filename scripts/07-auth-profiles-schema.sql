-- ============================================================
-- SIPCOT TRACK -- Fix 07: Unified Auth & Profiles Schema
-- Run this in Supabase SQL Editor BEFORE deploying the app.
-- ============================================================

-- Step 1: Create profiles table (single source of truth for roles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  role          TEXT NOT NULL CHECK (role IN ('industry', 'official', 'admin')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
  -- Industry-specific fields
  industry_name TEXT,
  allottee_code TEXT,
  -- Official-specific fields
  district      TEXT,
  department    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles: read own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (non-role fields)
CREATE POLICY "profiles: update own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Service role can do everything (for admin operations)
CREATE POLICY "profiles: service role all" ON public.profiles
  USING (true) WITH CHECK (true);

-- Step 3: Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'industry'),
    CASE
      WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'industry') = 'industry' THEN 'active'
      ELSE 'pending'   -- officials and admins need approval
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role      = EXCLUDED.role;

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Helper function for middleware to get role by user id
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Step 5: Migrate existing users from public.users table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
    INSERT INTO public.profiles (id, email, full_name, role, status)
    SELECT
      id,
      email,
      COALESCE(full_name, ''),
      COALESCE(role, 'industry'),
      COALESCE(status, 'active')
    FROM public.users
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Migrated existing users to profiles table';
  END IF;
END $$;

-- Step 6: Verify
SELECT id, email, role, status FROM public.profiles LIMIT 10;
