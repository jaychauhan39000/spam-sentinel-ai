-- 1. Add user_id (nullable first, backfill, then enforce NOT NULL)
ALTER TABLE public.detections ADD COLUMN IF NOT EXISTS user_id uuid;

-- Backfill any pre-existing public rows so the NOT NULL can be applied.
UPDATE public.detections SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;

ALTER TABLE public.detections ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS detections_user_id_created_at_idx
  ON public.detections (user_id, created_at DESC);

-- 2. Replace permissive policies with auth-scoped policies
DROP POLICY IF EXISTS "Anyone can read detections" ON public.detections;
DROP POLICY IF EXISTS "Anyone can insert detections" ON public.detections;

REVOKE ALL ON public.detections FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detections TO authenticated;
GRANT ALL ON public.detections TO service_role;

CREATE POLICY "Users can view their own detections"
  ON public.detections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own detections"
  ON public.detections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own detections"
  ON public.detections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own detections"
  ON public.detections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);