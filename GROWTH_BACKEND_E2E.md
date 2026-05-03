# TinySteps — Growth Component End-to-End Reference

> Complete walkthrough of the **Growth Forecaster** module: database → backend → ML models → API → frontend. Every layer, every endpoint, every field. Use this as the single source of truth for the growth feature.

---

## 0. Bird's-Eye View

```
┌────────────────────────┐         ┌──────────────────────────┐         ┌────────────────────────┐
│   Frontend (Expo RN)   │         │   FastAPI backend        │         │   Supabase Postgres    │
│                        │         │   backEnd/app.py         │         │                        │
│  growth.tsx            │  REST   │   ┌───────────────────┐  │  pg     │   infants              │
│  daily-log.tsx         │ ──────▶ │   │ growth_router.py  │  │ ──────▶ │   measurements         │
│  update-measurements   │         │   └───────────────────┘  │         │   daily_logs           │
│  growth-insights.tsx   │         │   loads PyTorch + sklearn│         │   growth_alerts (opt.) │
│  growth-history.tsx    │  SDK    │   ┌───────────────────┐  │         │                        │
│                        │ ──────▶ │   │ Supabase service  │  │         │  RLS by parent_id      │
│  uses Supabase client  │ direct  │   │ role client       │  │         │                        │
│  for auth + writes     │ writes  │   └───────────────────┘  │         │                        │
└────────────────────────┘         └──────────────────────────┘         └────────────────────────┘
                                            │
                                            ▼
                              ┌───────────────────────────┐
                              │ mlModels/Growth/          │
                              │   lstm_weight_variantB.pth│
                              │   scaler_variantB.pkl     │
                              │   rf_risk_2b.pkl          │
                              │   xgb_risk_2a.pkl         │
                              │   rf_anomaly_2a.pkl       │
                              │   xgb_anomaly_2a.pkl      │
                              └───────────────────────────┘
```

**Two write paths into the database:**

1. **Frontend → Supabase directly** (RLS-protected) — for `daily_logs`, `measurements`, and the `infants` profile. The frontend uses the `EXPO_PUBLIC_SUPABASE_ANON_KEY` and `auth.uid()` is checked by RLS.
2. **Frontend → FastAPI → Supabase (service role)** — for read-heavy aggregate dashboard queries and for `growth_alerts` insert. The backend uses `SUPABASE_SERVICE_ROLE_KEY`, which **bypasses RLS** — that's why no auth is enforced today (a known security gap, see §11).

---

## 1. Data Model (Supabase Postgres)

Canonical schema lives in [SUPABASE_SCHEMA_FIX.sql](SUPABASE_SCHEMA_FIX.sql). Three tables drive Growth.

### 1.1 `public.infants`

The infant profile + maternal context. One row per baby; `parent_id` ties it to the auth user.

| Column | Type | Used by Growth |
|--------|------|----------------|
| `id` | uuid PK | Foreign key for everything |
| `parent_id` | uuid → `profiles.id` | RLS check |
| `name` | text | UI display |
| `date_of_birth` | date | **Critical** — drives `age_in_days` |
| `gender` | text (`male` / `female` / `other`) | WAZ lookup table + LSTM feature |
| `birth_weight_kg` | numeric(5,2) | LSTM feature `Birth_Weight_g` (× 1000) |
| `gestational_age_weeks` | integer | LSTM + risk feature |
| `maternal_bmi` | numeric(5,2) | LSTM + risk feature |
| `ses_level` | text | LSTM + risk feature (cast to int) |
| `maternal_nutrition_quality` | text | LSTM + risk feature (cast to int) |
| `gestational_diabetes` | boolean *(implicit)* | Risk + anomaly feature |
| `breastfeeding_status` | boolean | Informational |
| `last_measurement_date` | date | UI helper |

**RLS:** `using (auth.uid() = parent_id)` — full CRUD limited to owner.

### 1.2 `public.measurements`

Weight / height / head-circumference snapshots. Sparse (whenever the parent weighs the baby).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `infant_id` | uuid → `infants.id` cascade | |
| `measured_date` | date | **`unique(infant_id, measured_date)`** — one measurement per day |
| `weight_g` | numeric(7,2) | Used for WAZ + LSTM target |
| `height_cm` | numeric(5,2) | |
| `head_circumference_cm` | numeric(5,2) | Optional |
| `notes` | text | |

**RLS:** scoped through `infants.parent_id`.

**Frontend write:** `update-measurements.tsx:97` — `supabase.from('measurements').upsert(...)` keyed on `(infant_id, measured_date)`.

### 1.3 `public.daily_logs`

Daily caregiver-entered data: feeding, sleep, illness. Sparse (skipped days are missing rows). The LSTM needs **7 daily logs** before predictions activate.

| Column | Type | Maps to ML feature |
|--------|------|---------------------|
| `id` | uuid PK | |
| `infant_id` | uuid → `infants.id` | |
| `log_date` | date | |
| `sleep_hours` | numeric(4,2) | `Sleep_Hours` |
| `feed_type` | text (`breastfed` / `formula` / `mixed`) | `FeedType_*` one-hot |
| `f_breast_formula` | int | `F_Breast_Formula` |
| `f_solid_meal` | int | `F_Solid_Meal` |
| `f_nutritious_snacks` | int | `F_Nutritious_Snacks` |
| `f_iron_rich` | int (0/1) | `F_Iron_Rich` |
| `f_animal_protein` | int (0/1) | `F_Animal_Protein` |
| `f_plant_based` | int (0/1) | `F_Plant_Based` |
| `f_junk_food` | int (0/1) | `F_Junk_Food` |
| `feeding_frequency` | int | `Feeding_Frequency` (also drives `Feeding_Compliance`) |
| `daily_calorie_intake` | int | `Daily_Calorie_Intake` |
| `has_illness` | boolean | `Illness_Day` |
| `illness_type` | text | `IllType_*` one-hot |
| `recovery_day` | int | `Recovery_Day` |

**Frontend write:** `daily-log.tsx:258 / :261` — insert or update by row `id`.

**Recovery-day logic** (computed on the client at save time):

```ts
if (!isSick && yesterday.has_illness)              recovery_day = 1;
else if (!isSick && yesterday.recovery_day > 0)    recovery_day = min(prev + 1, 21);
else                                                recovery_day = 0;
```

### 1.4 `public.growth_alerts` *(referenced by backend but not in canonical schema)*

The backend inserts here when an alert fires (`growth_router.py:557`). **Note: this table is not in `SUPABASE_SCHEMA_FIX.sql` today.** Either create it or treat the insert as best-effort.

Suggested DDL:

```sql
create table public.growth_alerts (
  id uuid default gen_random_uuid() primary key,
  infant_id uuid references public.infants on delete cascade not null,
  alert_date date not null,
  alert_type text,            -- threshold | velocity_faltering | baseline_deviation | both
  message text,
  recommendation text,
  risk_score numeric(5,4),
  is_read boolean default false,
  created_at timestamptz default now()
);
create index growth_alerts_infant_id_idx on public.growth_alerts (infant_id);
alter table public.growth_alerts enable row level security;
create policy "Users see own alerts" on public.growth_alerts for all
  using (exists (select 1 from public.infants where infants.id = growth_alerts.infant_id and infants.parent_id = auth.uid()));
```

---

## 2. ML Model Inventory

All artifacts live in `mlModels/Growth/`. Loaded once at FastAPI boot via [growth_router.py:85-147](backEnd/routers/growth_router.py#L85-L147).

| File | Algorithm | Input | Output | Used for |
|------|-----------|-------|--------|----------|
| `lstm_weight_variantB.pth` | PyTorch LSTM (1 layer, hidden=64, in=21) | 7-day window × 21 features | `[Δweight_g, Δheight_cm]` (next-day) | 7-day forecast |
| `scaler_variantB.pkl` | sklearn StandardScaler | continuous cols of the 21 | scaled values | preprocess for LSTM |
| `rf_risk_2b.pkl` | RandomForest classifier | 31 behavioral features | P(at-risk) | Risk when no recent weight |
| `xgb_risk_2a.pkl` | XGBoost classifier | same 31 features (alias) | P(at-risk) | Risk when weight measured ≤ 14 days ago |
| `rf_anomaly_2a.pkl` | RandomForest classifier | 40 features | P(anomaly) | Anomaly endpoint |
| `xgb_anomaly_2a.pkl` | XGBoost classifier | 40 features | P(anomaly) | Ensemble with RF |

### 2.1 LSTM architecture (must match training)

```python
class LSTMForecaster(nn.Module):
    def __init__(self, input_size=21, hidden_size=64, num_layers=1, bidirectional=False):
        super().__init__()
        self.lstm = nn.LSTM(input_size=21, hidden_size=64, num_layers=1, batch_first=True)
        self.bn   = nn.BatchNorm1d(64)
        self.fc   = nn.Linear(64, 2)   # [Δweight_g, Δheight_cm]
```

The architecture is hardcoded — if you retrain with different `hidden_size` / `num_layers` / `bidirectional`, update [growth_router.py:39-59](backEnd/routers/growth_router.py#L39-L59) too, or `load_state_dict` will fail.

### 2.2 Feature orderings (must match training column-for-column)

Stored as Python lists in [growth_router.py:62-70 and :204-216](backEnd/routers/growth_router.py#L62-L216):

```python
VARIANT_B = [   # 21 features for LSTM
    'F_Breast_Formula','F_Solid_Meal','F_Nutritious_Snacks',
    'F_Iron_Rich','F_Animal_Protein','F_Plant_Based','F_Junk_Food',
    'Feeding_Frequency','Sleep_Hours','Age_in_Days','Gender',
    'Illness_Day','SES_Level','Maternal_BMI',
    'Gestational_Age_Weeks','Birth_Weight_g',
    'Gestational_Diabetes','Maternal_Nutrition_Score',
    'FeedType_breastfed','FeedType_formula','FeedType_mixed',
]

BINARY_COLS = [  # passed through scaler unchanged
    'Gender','Gestational_Diabetes','Illness_Day',
    'FeedType_breastfed','FeedType_formula','FeedType_mixed',
]

VARIANT_B_RISK = [  # 31 features for RF/XGB risk
    'Age_in_Days','Gender_Male',
    'F_Breast_Formula','F_Solid_Meal','F_Nutritious_Snacks',
    'F_Iron_Rich','F_Animal_Protein','F_Plant_Based','F_Junk_Food',
    'Feeding_Frequency','Feeding_Source_Diversity','Feeding_Compliance',
    'Daily_Calorie_Intake','Sleep_Hours',
    'Illness_Day','Recovery_Day','Has_Illness_Episode',
    'SES_Level','Maternal_BMI','Gestational_Diabetes',
    'Maternal_Nutrition_Score','Gestational_Age_Weeks','Birth_Weight_g',
    'IllType_diarrhoea','IllType_fever','IllType_none',
    'IllType_persistent','IllType_respiratory',
    'FeedType_breastfed','FeedType_formula','FeedType_mixed',
]
```

`VARIANT_B_RISK_XGB = VARIANT_B_RISK` (alias — both share 31 features today).

### 2.3 Stub fallbacks

If the model file is missing, every inference function returns a hardcoded "stub" with `"stub": true`:

- LSTM stub → `{predicted_weight_change_g: 14.5, predicted_height_change_cm: 0.11}`
- Risk stub → `{risk_score: 0.15}`
- Anomaly endpoint → 503 (no stub, intentionally hard fail)

This is why startup logs print `✅` / `⚠️` lines for each model: the system runs in "stub" mode if any artifact is missing, which is invisible to the frontend other than the stub flag in the JSON.

---

## 3. Feature Construction Pipeline

The backend builds two different feature dicts from the same daily-log row:

### 3.1 LSTM features — `build_feature_row(log, infant, age_days)` ([:172-196](backEnd/routers/growth_router.py#L172-L196))

```python
{
  'F_Breast_Formula':       log['f_breast_formula'],
  'F_Solid_Meal':           log['f_solid_meal'],
  'F_Nutritious_Snacks':    log['f_nutritious_snacks'],
  'F_Iron_Rich':            log['f_iron_rich'],
  'F_Animal_Protein':       log['f_animal_protein'],
  'F_Plant_Based':          log['f_plant_based'],
  'F_Junk_Food':            log['f_junk_food'],
  'Feeding_Frequency':      log['feeding_frequency'],
  'Sleep_Hours':            float(log['sleep_hours'] or 12.0),
  'Age_in_Days':            (log_date - dob).days,
  'Gender':                 1 if infant.gender=='male' else 0,
  'Illness_Day':            1 if log['has_illness'] else 0,
  'SES_Level':              int(infant.ses_level or 1),
  'Maternal_BMI':           float(infant.maternal_bmi or 22.0),
  'Gestational_Age_Weeks':  int(infant.gestational_age_weeks or 38),
  'Birth_Weight_g':         (infant.birth_weight_kg or 3.2) * 1000,
  'Gestational_Diabetes':   1 if infant.gestational_diabetes else 0,
  'Maternal_Nutrition_Score': int(infant.maternal_nutrition_quality or 1),
  'FeedType_breastfed':     1 if feed_type=='breastfed' else 0,
  'FeedType_formula':       1 if feed_type=='formula'   else 0,
  'FeedType_mixed':         1 if feed_type=='mixed'     else 0,
}
```

Then 7 of these dicts (one per day) are stacked into a `(7, 21)` matrix → scaled (continuous cols only) → wrapped to `(1, 7, 21)` → fed to the LSTM. If fewer than 7 logs exist, `pad_window` left-pads with the oldest row.

### 3.2 Risk features — `build_risk_feature_row(log, infant, age_days)` ([:219-273](backEnd/routers/growth_router.py#L219-L273))

Same as above, plus three derived features:

```python
diversity   = sum(1 for v in [f_breast_formula, f_solid_meal, f_nutritious_snacks,
                              f_iron_rich, f_animal_protein, f_plant_based, f_junk_food]
                  if v > 0)
compliance  = min(feeding_frequency / 8.0, 1.0)   # 8 feeds/day target
illness_one_hot   = (IllType_diarrhoea, IllType_fever, IllType_none, IllType_persistent, IllType_respiratory)
```

Built once from the **most recent** daily log only (point-in-time risk, not a window).

### 3.3 Scaling rule — `scale_features(matrix)` ([:276-283](backEnd/routers/growth_router.py#L276-L283))

```python
binary_idx = [VARIANT_B.index(c) for c in BINARY_COLS]
cont_idx   = [i for i in range(21) if i not in binary_idx]
scaled[:, cont_idx] = scaler.transform(matrix[:, cont_idx])
# binary cols stay raw 0/1
```

The scaler was fit **only on continuous columns** during training. Mixing binary 0/1 into the scaler would corrupt means/stds.

---

## 4. WHO Weight-for-Age Z-Score (WAZ)

Implemented in `calculate_waz(weight_kg, age_days, gender)` ([:150-169](backEnd/routers/growth_router.py#L150-L169)).

**Approach:** linear lookup table at 30-day intervals (0..365 days), separate for male/female. SD is approximated as `median × 0.13`.

```
WAZ = (weight_kg - median_at_age) / sd
sd  ≈ 0.13 × median
```

| WAZ band | Color | Friendly label (frontend) |
|----------|-------|---------------------------|
| `> -1` | green | "Growing Well 🌱" |
| `-2 < WAZ ≤ -1` | yellow | "Keep an Eye On It 👀" |
| `WAZ ≤ -2` | red | "Needs Attention 💛" |
| `null` | grey | "No Data Yet 📊" |

**Caveat:** Real WHO uses LMS parameters (Lambda/Mu/Sigma) per age in days. The current 13-point lookup is a research approximation — see §11 for the upgrade path. Acceptable for this thesis but should be swapped with `pygrowup` or LMS tables for production.

### 4.1 Personal baseline

`calc_personal_baseline(measurements, dob, gender)` ([:429-446](backEnd/routers/growth_router.py#L429-L446)) — averages the WAZ of the **first 7 measurements** of the baby's life. This becomes the "personal anchor" used by the rule engine to detect drops below the baby's *own* trajectory (not the population norm).

---

## 5. Rule Engine — when to fire an alert

`run_rule_engine(...)` ([:367-426](backEnd/routers/growth_router.py#L367-L426)). Three triggers, OR'd:

| Trigger | Condition | Type code |
|---------|-----------|-----------|
| **1. WHO threshold** | predicted WAZ in 7 days < -2.0 | `threshold` |
| **2. Velocity faltering** | currently above -1.5 AND drops more than 0.7 WAZ in 7 days | `velocity_faltering` |
| **3. Baseline deviation** | currently more than 1.0 below the baby's personal first-7-day baseline (skipped if `age_days ≤ 30`) | `baseline_deviation` |

If both 1 and 2 fire → `trigger_type = "both"`. Each path produces a `message` and `recommendation` string the frontend renders verbatim.

The 7-day projection is:

```python
predicted_weight_7d = current_weight_kg + (predicted_Δweight_g / 1000) × 7
predicted_waz_7d    = WAZ(predicted_weight_7d, age_days + 7, gender)
waz_drop            = current_waz - predicted_waz_7d
```

When an alert fires, `growth_router.py:557-565` inserts a row into `growth_alerts`. **There is no dedup** — refreshing the dashboard 5× today produces 5 rows. Fix is in §11.

---

## 6. Backend HTTP API

Mounted at prefix `/api` from `backEnd/app.py`, so all endpoints live under `http://<host>:8000/api/growth/...`.

### 6.1 `GET /api/growth/status`

Quick liveness probe for the model loaders.

```json
{
  "lstm_loaded":     true,
  "scaler_loaded":   true,
  "risk_rf_loaded":  true,
  "risk_xgb_loaded": true,
  "mode":            "live"
}
```

### 6.2 `GET /api/growth/dashboard/{infant_id}` ★ main endpoint

The **single read used by the home and growth screens**. Does ~6 things in one round trip:

1. Fetch `infants` row (404 if not found).
2. Compute `age_days = today - date_of_birth`.
3. Fetch up to 50 `daily_logs` (chronological); take last 7 for the LSTM window.
4. Fetch up to 30 `measurements` (chronological); pick latest for current WAZ.
5. Compute `current_waz` and `personal_baseline`.
6. If `log_count >= 7`:
   - Run LSTM → `predicted_weight_change_g`, `predicted_height_change_cm`.
   - Pick risk model (XGBoost 2A if a weight measurement exists ≤ 14 days ago, else RF 2B).
   - Run rule engine; if alert fires, insert into `growth_alerts`.

**Response shape:**

```json
{
  "baby_name": "Aria",
  "age_days": 142,
  "log_count": 12,
  "logs_needed": 0,
  "ai_ready": true,
  "current_waz": -0.42,
  "waz_color": "green",
  "latest_weight_g": 6800,
  "latest_height_cm": 64.5,
  "chart_data": [ { "measured_date": "2026-04-01", "weight_g": 6500, "height_cm": 63.5 }, ... ],
  "personal_baseline": -0.31,
  "prediction": {
    "predicted_weight_change_g": 22.1,
    "predicted_height_change_cm": 0.13,
    "stub": false
  },
  "risk_score": 0.18,
  "risk_level": "Low",
  "alert": {
    "alert_fired": false,
    "trigger_type": "none",
    "current_waz": -0.42,
    "predicted_waz_7day": -0.39,
    "waz_drop": -0.03,
    "alert_message": "Baby's growth is on track.",
    "recommendation": ""
  }
}
```

**Risk routing logic:**

```python
weight_available = latest_meas and latest_meas.weight_g is not None and \
                   (today - latest_meas.measured_date).days <= 14

if weight_available and xgb_model is not None:
    use XGBoost 2A     →  more accurate, weight-aware
else:
    use RF 2B          →  behavior-only fallback
```

**Risk-level binning** (frontend reads this string, not the score):

```
score < 0.30  → "Low"
score < 0.60  → "Medium"
otherwise     → "High"
```

### 6.3 `GET /api/growth/history/{infant_id}?days=30`

Recent daily logs, descending. Defaults to 30 days; the frontend `growth-history.tsx` uses the default.

```json
{ "logs": [ { ...daily_logs row... }, ... ], "count": 30 }
```

### 6.4 `POST /api/growth/anomaly-score`

Standalone anomaly endpoint that **runs both `rf_anomaly_2a` and `xgb_anomaly_2a`** and ensembles them. Takes 40 features in the request body (`AnomalyScoreRequest` Pydantic model). Defaults are sane so the frontend can omit anything it doesn't have.

**Feature vector built inline** ([:673-692](backEnd/routers/growth_router.py#L673-L692)) — 40 columns. The frontend (`growth-insights.tsx:80-103`) only sends ~18 fields; the rest fall back to defaults defined in the request schema.

**Response:**

```json
{
  "rf_anomaly_score":       0.21,
  "xgb_anomaly_score":      0.18,
  "ensemble_anomaly_score": 0.195,
  "confidence":             "high",     // |rf - xgb| < 0.15
  "anomaly_label":          "normal",   // normal | monitoring | anomaly | critical
  "recovery_signal":        false,      // recovery_day > 0 AND ensemble < 0.35
  "gdm_sensitive":          false,      // gestational_diabetes flag echoed
  "alert_message":          "All clear"
}
```

**Label thresholds:**

```
ensemble < 0.35  → "normal"      "All clear"
       < 0.50  → "monitoring"  "Monitoring — borderline signal"
       < 0.65  → "anomaly"     "Acute episode detected"
otherwise      → "critical"    "Critical — consult a doctor immediately"
```

503 is returned if `rf_anomaly_model is None`. If `xgb_anomaly_model` is missing, `xgb_score = rf_score` (degenerate ensemble = single-model output).

---

## 7. Frontend — Growth Screens

All under `frontEnd/app/(tabs)/`. Hidden from the tab bar (`href: null` in `_layout.tsx`) — entered via push from the home tab or the growth tab.

### 7.1 Screens & responsibilities

| Screen | File | Purpose |
|--------|------|---------|
| **Home** | `index.tsx` | Calls `GET /api/growth/dashboard/{id}` for hero stats; redirects log/measure CTAs. |
| **Growth Dashboard** | `growth.tsx` | Hero + WAZ status pill + AI progress card + 7-day forecast + risk badge + 7-point line chart. |
| **Daily Log** | `daily-log.tsx` | Form → upserts `daily_logs` directly via Supabase (bypasses the backend). Triggers AI when row #7 lands. |
| **Update Measurements** | `update-measurements.tsx` | Form → upserts `measurements` directly via Supabase. |
| **Growth Insights** | `growth-insights.tsx` | Calls `/dashboard` AND `POST /anomaly-score`; renders ensemble interpretation. |
| **Growth History** | `growth-history.tsx` | Calls `/api/growth/history/{id}` for the last 30 days of logs. |

### 7.2 API base URL — currently inconsistent

- `growth.tsx:19` → `http://localhost:8000/api` (hardcoded; iOS / Android emulator only)
- `growth-insights.tsx:15` → `localhost` on web, `http://192.168.8.119:8000/api` on device
- Other features use `EXPO_PUBLIC_API_BASE_URL`

**To fix:** consolidate on a single `lib/api.ts` helper that reads `EXPO_PUBLIC_API_BASE_URL` and falls back sensibly.

### 7.3 Growth dashboard render flow (`growth.tsx`)

```
useFocusEffect → fetchDashboard():
  1. supabase.from('infants').eq('parent_id', user.id).maybeSingle()
  2. fetch('/api/growth/dashboard/' + infant.id)
  3. supabase.from('daily_logs').eq('log_date', today)  // today's-log boolean
```

State variables straight off the response:

```ts
ageDays         ← data.age_days
logsNeeded      ← data.logs_needed         // = max(0, 7 - log_count)
aiReady         ← data.ai_ready            // log_count >= 7
measurements    ← data.chart_data
wazScore        ← data.current_waz
prediction      ← data.prediction          // {predicted_weight_change_g, predicted_height_change_cm}
riskLevel       ← data.risk_level          // "Low" | "Medium" | "High" | null
growthAlert     ← data.alert?.alert_fired ? data.alert : null
```

**Conditional UI:**

- `aiReady === false` → show "Building your baby's profile" card with `(7-logsNeeded)/7` dots.
- `aiReady === true` → show **This Week's Outlook** with predicted weight/height gain.
- `growthAlert != null` → show the red AlertTriangle card with `alert_message` + `recommendation`.
- `wazScore` drives the hero pill (`getWazStatus`).
- `riskLevel` drives the Health Check card (`getRiskConfig`).

### 7.4 Chart

`WeightChart` in `growth.tsx:409` — pure RN (no chart library):

- Slices last 7 measurements.
- Computes (min, max) → maps weight to a 100-px y-range.
- `LineRenderer` draws each segment as a rotated `<View>` (CSS rotate). No SVG.
- Empty state: `< 2` measurements → "Add 2+ measurements to see your chart".

### 7.5 Daily log form → DB write

`daily-log.tsx:240-263` builds this exact payload and writes directly through Supabase (RLS validates `parent_id`):

```ts
{
  infant_id, log_date,
  sleep_hours, feed_type,
  f_breast_formula:    milkFeeds,
  f_solid_meal:        solidMeals,
  f_nutritious_snacks: snacks,
  f_iron_rich:    ironRich    ? 1 : 0,
  f_animal_protein: animalProt ? 1 : 0,
  f_plant_based:  plantBased  ? 1 : 0,
  f_junk_food:    junkFood    ? 1 : 0,
  feeding_frequency:    milkFeeds + solidMeals + snacks,
  daily_calorie_intake: estimatedCalories,
  has_illness:          isSick,
  illness_type:         isSick ? illnessType : null,
  recovery_day,
}
```

The illness-type strings (`'Diarrhoea' | 'Respiratory' | 'Fever' | 'Persistent'`) get **lowercased** by the backend (`.lower()`) before one-hot encoding. **`'other'` is not a valid value** — the dropdown was redesigned to use `'Persistent'` instead, mapped to `IllType_persistent` in the model.

After save, the screen shows a success Alert and `router.replace('/(tabs)/')` back to home.

### 7.6 Update measurements → DB write

`update-measurements.tsx:97`:

```ts
supabase.from('measurements').upsert({
  infant_id, measured_date, weight_g, height_cm, notes
}, { onConflict: 'infant_id,measured_date' });
```

The `unique(infant_id, measured_date)` constraint plus `upsert` means logging the same date twice silently overwrites — intentional.

### 7.7 Insights — `growth-insights.tsx`

Two-step fetch:

1. `GET /api/growth/dashboard/{infantId}` — for `risk_score`, `risk_level`, `current_waz`, etc.
2. Pull the most recent `daily_logs` row directly from Supabase.
3. Compute `weight_velocity` from the last two `chart_data` points.
4. `POST /api/growth/anomaly-score` with all of the above.
5. Render an `alertMatrix` that combines **risk score × anomaly score** into a single user-facing label.

This is the only place where the anomaly endpoint is called — neither the home nor the growth dashboard hits it.

---

## 8. End-to-End Sequence Diagrams

### 8.1 First-time user — onboarding to "AI Ready"

```
Day 1
─────
User signs up → profile created via Supabase trigger
User adds infant  → INSERT into public.infants (RLS-checked)
User opens Home   → GET /api/growth/dashboard/{id}
                    → log_count=0 → ai_ready=false, logs_needed=7
                    → "Log 7 more days to unlock AI predictions"

Day 1 evening
─────────────
User opens Daily Log → fills form → INSERT into public.daily_logs
                       (frontend → Supabase direct, NOT via backend)

… repeats for 7 days …

Day 7
─────
User submits 7th log    → INSERT row #7
User opens Growth tab   → GET /api/growth/dashboard/{id}
                          → log_count=7 → ai_ready=true
                          → backend now runs LSTM + risk + rule engine
                          → response includes prediction.* and risk_level
                          → frontend reveals "This Week's Outlook" card
```

### 8.2 Daily check after AI activation

```
Frontend (growth.tsx focus)
   │
   ├──► supabase.infants.maybeSingle()                  -- direct read
   │
   ├──► GET /api/growth/dashboard/{infant_id}           -- backend
   │       │
   │       ├── supabase.infants.eq(id).single()         -- service role
   │       ├── supabase.daily_logs.eq(infant_id).order(log_date)
   │       ├── supabase.measurements.eq(infant_id).order(measured_date)
   │       │
   │       ├── calculate_waz(latest weight, age, gender)
   │       ├── calc_personal_baseline(first 7 measurements)
   │       │
   │       ├── if log_count ≥ 7:
   │       │      build 7×21 feature window  → LSTM   → Δweight / Δheight
   │       │      build 31-feature row       → RF/XGB → P(at-risk)
   │       │      run_rule_engine(...)               → alert object
   │       │      if alert_fired: supabase.growth_alerts.insert(...)
   │       │
   │       └── return JSON
   │
   └──► supabase.daily_logs.eq(log_date, today)         -- "logged today?" check
```

### 8.3 Insights page (anomaly path)

```
Frontend (growth-insights.tsx)
   ├──► GET /api/growth/dashboard/{infant_id}        ── reuse risk_level
   ├──► supabase.daily_logs.order(log_date).limit(1) ── most recent
   │
   ├── compute weight_velocity from chart_data[-2:]
   │
   └──► POST /api/growth/anomaly-score   { 18 fields }
            ├── pad to 40 features (defaults from Pydantic model)
            ├── rf_anomaly_2a.predict_proba()
            ├── xgb_anomaly_2a.predict_proba()
            ├── ensemble = (rf + xgb) / 2
            ├── confidence = high if |rf - xgb| < 0.15 else low
            └── label = bin(ensemble) into normal/monitoring/anomaly/critical
```

---

## 9. Configuration & Environment

| Variable | Where | Purpose |
|----------|-------|---------|
| `SUPABASE_URL` | root `.env` | Read by `growth_router.py:18` to construct the service-role client. |
| `SUPABASE_SERVICE_ROLE_KEY` | root `.env` | **Bypasses RLS.** Required for backend reads/writes. |
| `EXPO_PUBLIC_SUPABASE_URL` | `frontEnd/.env` | Frontend Supabase client. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `frontEnd/.env` | Frontend Supabase client (RLS still enforced here). |
| `EXPO_PUBLIC_API_BASE_URL` | `frontEnd/.env` | The base URL for FastAPI calls. **Currently ignored by `growth.tsx`** (hardcoded localhost). |

Boot logs to look for:

```
✅ [Growth] Supabase client connected
✅ [Growth] Scaler loaded
✅ [Growth] LSTM loaded
✅ [Growth] Risk model loaded
✅ [Growth] XGBoost 2A loaded
✅ [Growth] RF Anomaly 2A loaded
✅ [Growth] XGB Anomaly 2A loaded
```

Any `⚠️` line means that model degraded to its stub (LSTM/risk) or 503 (anomaly).

---

## 10. Manual Testing Recipes

```bash
# 1. Backend up?
curl http://localhost:8000/api/growth/status

# 2. Dashboard for one infant (replace UUID)
curl "http://localhost:8000/api/growth/dashboard/00000000-0000-0000-0000-000000000000" | jq

# 3. History (last 14 days)
curl "http://localhost:8000/api/growth/history/<infant_id>?days=14" | jq

# 4. Anomaly score with minimal payload
curl -X POST http://localhost:8000/api/growth/anomaly-score \
     -H 'Content-Type: application/json' \
     -d '{
       "age_in_days": 120,
       "weight_g": 6500,
       "height_cm": 63,
       "waz_score": -0.4,
       "feeding_frequency": 7,
       "daily_calorie_intake": 700
     }' | jq
```

To force the AI-ready state without hand-typing 7 daily logs, insert directly:

```sql
insert into public.daily_logs (infant_id, log_date, sleep_hours, feed_type, f_breast_formula, feeding_frequency, daily_calorie_intake, has_illness)
select '<infant_id>', current_date - g, 13, 'breastfed', 6, 6, 600, false
from generate_series(0, 6) g
on conflict do nothing;
```

---

## 11. Known Issues & Improvement Backlog

| # | Layer | Issue | Severity | Where |
|---|-------|-------|----------|-------|
| 1 | API | `/dashboard/{infant_id}` has **no ownership check** — any user with a valid UUID can read any baby. The service-role client bypasses RLS. | **HIGH** | `growth_router.py:464` |
| 2 | API | `require_auth` middleware exists but isn't wired onto growth routes. | HIGH | `middleware/auth.py` unused |
| 3 | DB | `growth_alerts` table is referenced but not in `SUPABASE_SCHEMA_FIX.sql`; insert silently fails if missing. | MED | `growth_router.py:557` |
| 4 | DB | Alert insert has **no dedup** — repeated dashboard refreshes on the same day pile rows. Add a unique constraint `(infant_id, alert_date, alert_type)`. | MED | `growth_router.py:557-565` |
| 5 | ML | WAZ uses 13-point linear interpolation + `sd ≈ median × 0.13` instead of WHO LMS. Acceptable for thesis, not for production. | MED | `growth_router.py:150-169` |
| 6 | ML | LSTM stub silently returns hardcoded `14.5 g/day, 0.11 cm` if weights file is missing. Frontend can't distinguish stub from real except via `prediction.stub`, which it doesn't surface. | MED | `growth_router.py:295-321` |
| 7 | ML | XGBoost 2A and RF 2B share the same 31-feature list; a true XGB-only feature set was never wired. Either retrain RF on 31 or extend XGB to 39. | LOW | `growth_router.py:201, 340` |
| 8 | FE | `API_URL` is hardcoded to `http://localhost:8000/api` in `growth.tsx:19` and `index.tsx:19`; on physical Android devices this resolves to the device's own loopback and times out. | HIGH (UX) | see §7.2 |
| 9 | FE | `growth-insights.tsx:15` hardcodes a LAN IP `192.168.8.119` for native — only works on one developer's network. | HIGH | `growth-insights.tsx:15` |
| 10 | FE | Anomaly request omits 22 of the 40 fields and leans on Pydantic defaults — quietly weakens the model. Send everything we have. | LOW | `growth-insights.tsx:80` |
| 11 | DB | `daily_logs` has no `unique(infant_id, log_date)` constraint, but the form treats it as if it does (insert vs update branch). Two parallel inserts on the same day will create dupes. Add a unique constraint to match `measurements`. | MED | `daily-log.tsx:261` |
| 12 | API | LSTM hidden_size/layers/window are hardcoded in Python rather than read from the checkpoint metadata that's already stored alongside the weights. | LOW | `growth_router.py:39-59` |

---

## 12. Quick Reference Cheat-Sheet

**Trigger AI predictions:** ≥ 7 rows in `daily_logs` for the infant.

**Trigger XGBoost risk model:** ≥ 1 row in `measurements` within the last 14 days.

**Trigger an alert insert:** any of `predicted_waz_7d < -2`, `current_waz > -1.5 ∧ waz_drop > 0.7`, or `current_waz < personal_baseline - 1` (after day 30).

**WAZ → color:** `> -1` green · `> -2` yellow · `≤ -2` red · `null` grey.

**Risk score → label:** `< 0.30` Low · `< 0.60` Medium · `≥ 0.60` High.

**Anomaly score → label:** `< 0.35` normal · `< 0.50` monitoring · `< 0.65` anomaly · `≥ 0.65` critical.

**Frontend writes that hit the DB directly (not via backend):** `daily_logs` (daily-log screen) and `measurements` (update-measurements screen). Everything else goes through FastAPI.
