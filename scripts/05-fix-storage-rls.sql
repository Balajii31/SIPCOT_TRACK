-- ============================================================
-- SIPCOT TRACK — Fix 05: Storage RLS for csr-documents bucket
-- Run this in Supabase SQL Editor → Run.
-- ============================================================

-- ── Step 1: Make sure the bucket exists and is public ──────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('csr-documents', 'csr-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ── Step 2: Drop any existing conflicting storage policies ─────────────────
DROP POLICY IF EXISTS "Allow anon upload to csr-documents"   ON storage.objects;
DROP POLICY IF EXISTS "Allow auth upload to csr-documents"   ON storage.objects;
DROP POLICY IF EXISTS "Allow public read csr-documents"      ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update csr-documents"      ON storage.objects;
DROP POLICY IF EXISTS "Allow anon delete csr-documents"      ON storage.objects;

-- ── Step 3: INSERT — allow anyone (demo mode) to upload ────────────────────
CREATE POLICY "Allow anon upload to csr-documents"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'csr-documents');

-- ── Step 4: SELECT — allow anyone to read (needed for public URL) ──────────
CREATE POLICY "Allow public read csr-documents"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'csr-documents');

-- ── Step 5: UPDATE — allow upsert to work ─────────────────────────────────
CREATE POLICY "Allow anon update csr-documents"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'csr-documents');

-- ── Step 6: DELETE — allow replacing files ─────────────────────────────────
CREATE POLICY "Allow anon delete csr-documents"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'csr-documents');

-- ── Done ───────────────────────────────────────────────────────────────────
-- You should see "Success. No rows returned."
-- Now try uploading a CSR file from the allottee form again.
