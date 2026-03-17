-- 1. asd_predictions table
CREATE TABLE IF NOT EXISTS public.asd_predictions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  infant_id   UUID REFERENCES public.infants(id) ON DELETE SET NULL,
  facial_prob FLOAT,
  qchat_prob  FLOAT,
  fused_prob  FLOAT,
  label       TEXT,
  confidence  TEXT,
  qchat_answers JSONB,
  frame_urls  TEXT[],
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Row Level Security
ALTER TABLE public.asd_predictions ENABLE ROW LEVEL SECURITY;

-- Parents can insert/view predictions for their own infants
CREATE POLICY "Parents can insert asd_predictions" ON public.asd_predictions
  FOR INSERT WITH CHECK (
    infant_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.infants
      WHERE infants.id = asd_predictions.infant_id
        AND infants.parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view asd_predictions" ON public.asd_predictions
  FOR SELECT USING (
    infant_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.infants
      WHERE infants.id = asd_predictions.infant_id
        AND infants.parent_id = auth.uid()
    )
  );

-- 3. asd-frames storage bucket (public so frame URLs are accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('asd-frames', 'asd-frames', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: allow inserts from authenticated users (backend uses service role key)
CREATE POLICY "Service role can upload asd frames" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'asd-frames');

CREATE POLICY "Public can view asd frames" ON storage.objects
  FOR SELECT USING (bucket_id = 'asd-frames');
