-- ============================================================
-- TinySteps Schema Fix — Aligns Supabase with Frontend Expectations
-- Run this in Supabase SQL Editor: replaces the existing schema.
-- ⚠️ Drops existing tables. Only run if no production data yet.
-- ============================================================

-- Drop old trigger/function first (they reference tables)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Drop all tables (cascade removes FKs)
drop table if exists public.feedback cascade;
drop table if exists public.postpartum_checkins cascade;
drop table if exists public.daily_logs cascade;
drop table if exists public.asd_predictions cascade;
drop table if exists public.measurements cascade;
drop table if exists public.infants cascade;
drop table if exists public.profiles cascade;

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index profiles_email_idx on public.profiles (email);

-- ============================================================
-- 2. INFANTS
-- ============================================================
create table public.infants (
  id uuid default gen_random_uuid() primary key,
  parent_id uuid references public.profiles on delete cascade not null,
  name text not null,
  date_of_birth date not null,
  gender text check (gender in ('male', 'female', 'other')),
  birth_weight_kg numeric(5,2),
  birth_height_cm numeric(5,2),
  current_weight_kg numeric(5,2),
  current_height_cm numeric(5,2),
  gestational_age_weeks integer,
  maternal_age integer,
  maternal_height_cm numeric(5,2),
  maternal_bmi numeric(5,2),
  ses_level text,
  maternal_nutrition_quality text,
  breastfeeding_status boolean,
  last_measurement_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index infants_parent_id_idx on public.infants (parent_id);

-- ============================================================
-- 3. MEASUREMENTS
-- ============================================================
create table public.measurements (
  id uuid default gen_random_uuid() primary key,
  infant_id uuid references public.infants on delete cascade not null,
  measured_date date not null,
  weight_g numeric(7,2),
  height_cm numeric(5,2),
  head_circumference_cm numeric(5,2),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(infant_id, measured_date)
);

create index measurements_infant_id_idx on public.measurements (infant_id);
create index measurements_date_idx on public.measurements (measured_date);

-- ============================================================
-- 4. ASD_PREDICTIONS
-- ============================================================
create table public.asd_predictions (
  id uuid default gen_random_uuid() primary key,
  infant_id uuid references public.infants on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  prediction_type text check (prediction_type in ('facial', 'qchat', 'video', 'fused')),
  p_asd numeric(5,4),
  confidence text,
  risk_level text check (risk_level in ('Low', 'Moderate', 'High')),
  qchat_score integer,
  fusion_alpha numeric(3,2),
  frame_storage_path text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index asd_predictions_infant_id_idx on public.asd_predictions (infant_id);
create index asd_predictions_user_id_idx on public.asd_predictions (user_id);
create index asd_predictions_date_idx on public.asd_predictions (created_at);

-- ============================================================
-- 5. DAILY_LOGS
-- ============================================================
create table public.daily_logs (
  id uuid default gen_random_uuid() primary key,
  infant_id uuid references public.infants on delete cascade not null,
  log_date date not null,
  sleep_hours numeric(4,2),
  feed_type text,
  f_breast_formula integer,
  f_solid_meal integer,
  f_nutritious_snacks integer,
  f_iron_rich integer,
  f_animal_protein integer,
  f_plant_based integer,
  f_junk_food integer,
  feeding_frequency integer,
  daily_calorie_intake integer,
  has_illness boolean default false,
  illness_type text,
  recovery_day integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index daily_logs_infant_id_idx on public.daily_logs (infant_id);
create index daily_logs_date_idx on public.daily_logs (log_date);

-- ============================================================
-- 6. POSTPARTUM_CHECKINS
-- ============================================================
create table public.postpartum_checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  weeks_since_delivery integer not null,
  delivery_type text check (delivery_type in ('Vaginal', 'Csection')),
  age integer,
  pain_location text,
  pain_severity integer check (pain_severity >= 1 and pain_severity <= 10),
  pain_pattern text,
  parenting_type text,
  predicted_pain numeric(5,2),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index postpartum_checkins_user_id_idx on public.postpartum_checkins (user_id);

-- ============================================================
-- 7. FEEDBACK
-- ============================================================
create table public.feedback (
  id uuid default gen_random_uuid() primary key,
  infant_id uuid references public.infants on delete cascade,
  user_id uuid references public.profiles on delete cascade,
  prediction_type text,
  user_rating integer check (user_rating >= 1 and user_rating <= 5),
  user_comment text,
  prediction_result text,
  audio_model_score numeric(5,4),
  image_model_score numeric(5,4),
  fusion_model_score numeric(5,4),
  model_inputs jsonb,
  class_probabilities jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index feedback_infant_id_idx on public.feedback (infant_id);
create index feedback_user_id_idx on public.feedback (user_id);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.infants enable row level security;
alter table public.measurements enable row level security;
alter table public.asd_predictions enable row level security;
alter table public.daily_logs enable row level security;
alter table public.postpartum_checkins enable row level security;
alter table public.feedback enable row level security;

-- ============================================================
-- RLS POLICIES
-- ============================================================
create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Users manage own infants" on public.infants for all using (auth.uid() = parent_id);

create policy "Users manage own measurements" on public.measurements for all
  using (exists (select 1 from public.infants where infants.id = measurements.infant_id and infants.parent_id = auth.uid()));

create policy "Users manage own daily_logs" on public.daily_logs for all
  using (exists (select 1 from public.infants where infants.id = daily_logs.infant_id and infants.parent_id = auth.uid()));

create policy "Users manage own asd_predictions" on public.asd_predictions for all using (auth.uid() = user_id);
create policy "Users manage own postpartum_checkins" on public.postpartum_checkins for all using (auth.uid() = user_id);
create policy "Users manage own feedback" on public.feedback for all using (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    now(),
    now()
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- DONE — list tables as confirmation
-- ============================================================
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
