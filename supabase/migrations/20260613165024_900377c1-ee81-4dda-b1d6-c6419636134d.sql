
CREATE TABLE public.detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  prediction TEXT NOT NULL CHECK (prediction IN ('Spam','Ham')),
  confidence NUMERIC(5,2) NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low','Medium','High')),
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT NOT NULL DEFAULT 'tfidf-lr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.detections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detections TO authenticated;
GRANT ALL ON public.detections TO service_role;

ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read detections"
  ON public.detections FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert detections"
  ON public.detections FOR INSERT
  WITH CHECK (true);

CREATE INDEX detections_created_at_idx ON public.detections (created_at DESC);
CREATE INDEX detections_prediction_idx ON public.detections (prediction);
