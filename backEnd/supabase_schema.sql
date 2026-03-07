-- ============================================================
-- TinySteps — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Infant profiles
CREATE TABLE IF NOT EXISTS infants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    dob         DATE NOT NULL,
    gender      TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Growth records (weight, height over time)
CREATE TABLE IF NOT EXISTS growth_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infant_id   UUID REFERENCES infants(id) ON DELETE CASCADE,
    weight_kg   FLOAT,
    height_cm   FLOAT,
    head_cm     FLOAT,
    age_months  FLOAT,
    notes       TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ASD prediction history
CREATE TABLE IF NOT EXISTS asd_predictions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infant_id       UUID REFERENCES infants(id) ON DELETE CASCADE,
    facial_prob     FLOAT,
    qchat_prob      FLOAT,
    fused_prob      FLOAT,
    label           TEXT,
    confidence      TEXT,
    qchat_answers   JSONB,
    frame_urls      JSONB DEFAULT '[]'::jsonb,   -- MD5-named cropped face images (Supabase Storage)
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add frame_urls to existing table (run once if table already exists)
-- ALTER TABLE asd_predictions ADD COLUMN IF NOT EXISTS frame_urls JSONB DEFAULT '[]'::jsonb;

-- 4. Cry analysis history
CREATE TABLE IF NOT EXISTS cry_analysis (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    infant_id       UUID REFERENCES infants(id) ON DELETE SET NULL,
    cry_reason      TEXT,
    audio_label     TEXT,
    audio_conf      FLOAT,
    face_label      TEXT,
    face_conf       FLOAT,
    context         JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
