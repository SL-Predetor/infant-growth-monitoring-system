-- ============================================================
-- TinySteps — Measurements & Daily Logs Tables
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Measurements table (weight/height tracking)
CREATE TABLE IF NOT EXISTS public.measurements (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infant_id     UUID REFERENCES public.infants(id) ON DELETE CASCADE NOT NULL,
    measured_date DATE NOT NULL,
    weight_g      FLOAT,
    height_cm     FLOAT,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(infant_id, measured_date)
);

-- 2. Daily logs table (feeding, sleep, illness tracking)
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infant_id             UUID REFERENCES public.infants(id) ON DELETE CASCADE NOT NULL,
    log_date              DATE NOT NULL,
    sleep_hours           FLOAT,
    feed_type             TEXT,
    f_breast_formula      INT DEFAULT 0,
    f_solid_meal          INT DEFAULT 0,
    f_nutritious_snacks   INT DEFAULT 0,
    f_iron_rich           INT DEFAULT 0,
    f_animal_protein      INT DEFAULT 0,
    f_plant_based         INT DEFAULT 0,
    f_junk_food           INT DEFAULT 0,
    feeding_frequency     INT DEFAULT 0,
    daily_calorie_intake  FLOAT DEFAULT 0,
    has_illness           BOOLEAN DEFAULT FALSE,
    illness_type          TEXT,
    recovery_day          INT DEFAULT 0,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(infant_id, log_date)
);

-- 3. Enable Row Level Security
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for measurements
-- Users can view measurements for their own infants
CREATE POLICY "Users can view own measurements" ON public.measurements
    FOR SELECT USING (
        infant_id IN (SELECT id FROM public.infants WHERE parent_id = auth.uid())
    );

CREATE POLICY "Users can insert own measurements" ON public.measurements
    FOR INSERT WITH CHECK (
        infant_id IN (SELECT id FROM public.infants WHERE parent_id = auth.uid())
    );

CREATE POLICY "Users can update own measurements" ON public.measurements
    FOR UPDATE USING (
        infant_id IN (SELECT id FROM public.infants WHERE parent_id = auth.uid())
    );

CREATE POLICY "Users can delete own measurements" ON public.measurements
    FOR DELETE USING (
        infant_id IN (SELECT id FROM public.infants WHERE parent_id = auth.uid())
    );

-- 5. RLS Policies for daily_logs
CREATE POLICY "Users can view own daily_logs" ON public.daily_logs
    FOR SELECT USING (
        infant_id IN (SELECT id FROM public.infants WHERE parent_id = auth.uid())
    );

CREATE POLICY "Users can insert own daily_logs" ON public.daily_logs
    FOR INSERT WITH CHECK (
        infant_id IN (SELECT id FROM public.infants WHERE parent_id = auth.uid())
    );

CREATE POLICY "Users can update own daily_logs" ON public.daily_logs
    FOR UPDATE USING (
        infant_id IN (SELECT id FROM public.infants WHERE parent_id = auth.uid())
    );

CREATE POLICY "Users can delete own daily_logs" ON public.daily_logs
    FOR DELETE USING (
        infant_id IN (SELECT id FROM public.infants WHERE parent_id = auth.uid())
    );

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_measurements_infant ON public.measurements(infant_id, measured_date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_infant ON public.daily_logs(infant_id, log_date);
