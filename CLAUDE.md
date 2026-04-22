# CLAUDE.md — TinySteps Infant Growth Monitoring System

> **Single master reference.** Everything an agent or teammate needs: backend, frontend, models, env, Docker, Supabase, OAuth, and the prioritized fix list. Absorbs and replaces the former README / FINAL_DOCKER_BUILD / LOGIN_SETUP / GOOGLE_OAUTH_SETUP / SUPABASE_SETUP / UX_AUDIT docs.

---

## 1. Project Overview

SLIIT final-year research project. Multi-modal infant care app with **4 ML components** built by a team of 4. Production app lives on the current working branch.

**Tech stack:** FastAPI (Python 3.11) + React Native / Expo 54 (TypeScript) + Supabase (PostgreSQL + Auth + Storage) + MongoDB + Docker.

**The 4 ML modules:**
1. **ASD Detection** (Yasindu) — VGG-Face CNN + LogReg probe + XGBoost Q-CHAT + α=0.15 late fusion
2. **Cry Translator** — GradientBoosting audio + RandomForest face landmarks + calibrated XGBoost fusion
3. **Growth Forecaster** — LSTM weight forecasting + RF/XGB risk & anomaly + WHO WAZ
4. **Postpartum Recovery** — RF perineal + RF C-section + Ridge back/pelvic + SHAP explanations

---

## 2. Repository Layout

```
backEnd/
  app.py                          # FastAPI entry, port 8000, CORS, mounts 7 routers
  database.py                     # Supabase client (reads env vars; returns None if missing)
  requirements.txt                # TF 2.20, XGBoost 3.2, sklearn 1.8, torch, pymongo, …
  Dockerfile                      # python:3.11-slim, apt ffmpeg, BuildKit cache mount
  ffmpeg.exe                      # 95 MB — Windows local dev only; excluded from Docker
  routers/
    asd_router.py                 # ASD: face, video, Q-CHAT, fused
    cry_router_audio.py           # Audio cry classification
    cry_router_img.py             # Face pain detection (MediaPipe + RF)
    cry_router_fusion.py          # Calibrated XGBoost 6-class fusion
    growth_router.py              # Growth forecast, dashboard, history, anomaly
    feedback_router.py            # User feedback → MongoDB (Discomfort collection)
  postpartum/
    __init__.py                   # Exports router from api.py
    api.py                        # 3-model pain prediction + SHAP
    db.py                         # MongoDB connection (pymongo, 30s cooldown)
    models/                       # 3 .joblib files (perineal, csection, back_pelvic)
  middleware/
    auth.py                       # Supabase JWT verification (available, not enforced)

mlModels/                         # CANONICAL model location. Routers use ../../mlModels
  autisumDetect/                  # ASD research artifacts (sectors 1-3)
  Cry/                            # Cry audio + fusion models
  CryTranslater/                  # Cry face model + MediaPipe face_landmarker.task
  Growth/                         # LSTM + RF/XGB risk/anomaly models

frontEnd/
  app/(auth)/                     # sign-in, sign-up, add-infant, forgot-password
  app/(tabs)/                     # 5-tab layout: Cry | Log | Home | ASD | Mom
  app/postpartum-dashboard.tsx    # Modal-style screens outside tabs group
  app/postpartum-history.tsx
  app/mom-prediction-result.tsx
  components/                     # Reusable UI
  constants/theme.ts              # TinySteps design tokens
  lib/supabase.ts                 # Supabase client (EXPO_PUBLIC_* env)
  lib/auth-context.tsx            # Real Supabase auth (Google still stub)
  services/                       # analysisService, postpartumService

supabase/migrations/
  001_auth_setup.sql              # profiles, infants, RLS (minimal)
  002_asd_setup.sql               # asd_predictions, asd-frames bucket
SUPABASE_SCHEMA_FIX.sql           # Canonical full schema — drops+recreates 7 tables

docker-compose.yml                # Single `backend` service
.dockerignore                     # Strips ffmpeg.exe, duplicate mlModels, secrets, dataset files
```

**Cleanup note (still pending):** `backEnd/mlModels/` is an exact duplicate of root `mlModels/` — unused at runtime (routers resolve `../../mlModels` from `backEnd/routers/` → root). It's excluded from Docker via `.dockerignore` but should be deleted from the repo.

---

## 3. Backend Architecture

### 3.1 app.py — Entry Point

`backEnd/app.py` (62 lines):
1. Loads `.env` via `python-dotenv`
2. Adds `backEnd/` to PATH so OpenCV finds `ffmpeg.exe` on Windows (harmless on Linux; Docker uses apt ffmpeg)
3. Sets up CORS with `allow_origins=["*"]`
4. Mounts all 7 routers with direct imports (no try/except — all must load)

| Router | Prefix | Tags |
|--------|--------|------|
| `asd_router` | `/api/asd` | ASD |
| `cry_router_audio` | — | Cry Analysis (Audio) |
| `cry_router_img` | — | Face Analysis (Image) |
| `cry_router_fusion` | `/fusion` | Fusion Analysis |
| `growth_router` | `/api` | Growth |
| `postpartum_router` | — | Postpartum |
| `feedback_router` | — | Feedback |

### 3.2 ASD Detection (Yasindu's Research)

**Research artifacts:** `mlModels/autisumDetect/{sector1, sector2, sector3}/` — notebooks, plots, models, data.

**Three sectors:**

- **Sector 1 — Facial (VGG-Face CNN)**
  - Prep: MTCNN face detection + MD5 dedup + augmentation → 3,917 images
  - Stage_1 frozen VGG-Face: 83.07% best
  - Stage_2 5-fold CV: blind test 76.02%, ASD recall 59%
  - Stage_3: 256-D embedding extraction
  - Stage_4: Phase 1 frozen + Phase 2 fine-tune (regressed to 67.1%)
  - **LogReg probe on embeddings: AUC 0.8593** (beats NN head at 0.7626)

- **Sector 2 — Q-CHAT-10 Questionnaire (XGBoost)**
  - Stage_0: 5-dataset merge (7,530 rows), 94.56%
  - Stage_1: Ablation proving `Who_completed_test` = population bias
  - **Stage_2 (production): parent-only filter (1,838 rows), 96.20%, AUC 0.9769**

- **Sector 3 — Late Fusion (Monte Carlo)**
  - 500 iter × 300 pairs, α sweep 0.00–1.00
  - Optimal α=0.15, AUC 0.9994
  - Joint FN rate 0.23% — complementarity is the real contribution

**Critical VGG-Face preprocessing (must match train/eval/inference exactly):**
- Resize 224×224
- RGB → BGR: `img[..., ::-1]`
- Subtract means `[93.5940, 104.7624, 129.1863]`
- **No** pixel normalization (no /255)

**Label convention:**
- Filesystem: Autistic=0 (alphabetical), Non_Autistic=1
- Training target: `1 - y` flip → Autistic=1, Non_Autistic=0

**Endpoints** (mounted at `/api/asd/`):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Health check, model-load status |
| `/predict-face` | POST | Image → MTCNN → VGG-Face → 256-D → LogReg → P(ASD) |
| `/predict-video` | POST | Video → per-frame pipeline → soft-avg P(ASD) + Supabase upload |
| `/predict-qchat` | POST | 12 features → XGBoost → P(ASD) + Q-CHAT score |
| `/predict-fused` | POST | α·facial + (1-α)·qchat → risk level + Supabase save |

**Constants:** `ALPHA=0.15`, `FACIAL_THRESHOLD=0.06`, `QCHAT_THRESHOLD=0.35`, `FUSION_THRESHOLD=0.35`.

**Honest research findings (thesis):**
- GradCAM shows dataset confound (age/photo-style, not ASD facial features)
- Calibration is poor (Brier=0.2111, ECE=0.0982, overconfident)
- Stage_4 regressed vs Stage_2 on every metric
- LogReg-beats-NN is the strongest methodological finding
- Q-CHAT SHAP reconstructs the scoring rule; no novel signal
- Fusion AUC gain is marginal; the 0.23% joint FN rate is the real win

### 3.3 Cry Translator

**Audio** — `cry_router_audio.py`: 2-stage GradientBoosting (Pain → Hunger/Normal), 355 features (MFCC + spectral), `noisereduce` preprocessing.
- Models: `model_a_pain.pkl` + `scaler_a.pkl`, `model_b_hunger.pkl` + `scaler_b.pkl`
- Endpoint: `POST /predict-cry` (multipart audio)

**Facial** — `cry_router_img.py`: Random Forest over MediaPipe face landmarks (EAR, MAR, brow distances).
- Model: `img_rf_pain_classifier3.pkl`
- Landmarker: `face_landmarker.task` (auto-downloads if missing — fails in air-gapped Docker)
- Endpoint: `POST /predict-face` (multipart image)

**Fusion** — `cry_router_fusion.py`: XGBoost + isotonic calibration, 6 classes.
- Models: `fusion_model_calibrated.pkl`, `fusion_label_encoder.pkl`
- Input: audio prediction + image prediction + context (age, sleep, feed, diaper, temp)
- Endpoints: `POST /fusion/predict`, `GET /fusion/health`

### 3.4 Growth Forecaster — `growth_router.py` (mounted at `/api`)

- **LSTM** `lstm_weight_variantB.pth` — 21-feature window, hidden=64, weight forecasting
- **Scaler** `scaler_variantB.pkl`
- **Risk classifiers** `rf_risk_2b.pkl`, `xgb_risk_2a.pkl` (fallback)
- **Anomaly detectors** `rf_anomaly_2a.pkl`, `xgb_anomaly_2a.pkl`
- Uses Supabase for infant/measurement data
- WHO WAZ percentile comparison

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/growth/dashboard/{infantId}` | GET | Metrics, WAZ, sparkline data |
| `/api/growth/history/{infantId}` | GET | Log history (default 60 days) |
| `/api/growth/anomaly-score` | POST | Risk + anomaly classification |

### 3.5 Postpartum Recovery — `postpartum/api.py`

3 pain models with SHAP explainability. MongoDB persistence.

| Model | File | Algorithm |
|-------|------|-----------|
| Perineal | `perineal_RandomForest.joblib` | Random Forest |
| C-section | `csection_RandomForest.joblib` | Random Forest |
| Back/Pelvic | `back_pelvic_Ridge.joblib` | Ridge Regression |

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/postpartum/predict` | POST | Pain prediction (3 categories) |
| `/postpartum/history` | GET | Check-in history |
| `/postpartum/dashboard` | GET | Aggregated stats |

### 3.6 Feedback — `feedback_router.py`

User star rating + comment, stored in MongoDB `TinySteps_db.Discomfort`.
- `POST /feedback` → `{ success, message, feedbackId }`
- Reuses `get_postpartum_collection().database["Discomfort"]`

### 3.7 Auth Middleware — `middleware/auth.py`

Supabase JWT verification via REST (`/auth/v1/user`). **Available but not applied on any route.**
- `get_current_user(credentials)` — returns user dict, `None`, or raises 401
- `require_auth(user)` — `Depends(require_auth)` for protected routes
- Env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

### 3.8 Supabase Client — `database.py`

- Reads `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- Returns `None` if either missing (graceful degradation)
- Used directly by `asd_router.py`

---

## 4. Model Files — Complete Inventory

### ASD (`mlModels/autisumDetect/`)

| File | Path | Size | Tracked | Loaded by |
|------|------|------|---------|-----------|
| VGG-Face CNN | sector1/Stage_4/models/fold_5_best.h5 | ~525 MB | **NO (gitignored)** | asd_router.py:69 |
| LogReg probe | sector1/Stage_4/models/logreg_probe_model.pkl | 2.9 KB | Yes | asd_router.py:80 |
| LogReg scaler | sector1/Stage_4/models/logreg_probe_scaler.pkl | 6.7 KB | Yes | asd_router.py:79 |
| XGBoost Q-CHAT | sector2/Stage_2/models/xgboost_qchat_stage2.pkl | 288 KB | Yes | asd_router.py:99 |
| Feature columns | sector2/Stage_2/models/qchat_feature_columns.pkl | 101 B | Yes | asd_router.py:100 |

The `.h5` file must be placed manually. Source: `C:\Users\Yasindu\Desktop\Stuff\1.SLIIT\Research\Project\Best_Models\fold_5_best.h5`.

### Cry (`mlModels/Cry/`, `mlModels/CryTranslater/`)

| File | Path | Loaded by |
|------|------|-----------|
| model_a_pain.pkl | Cry/ | cry_router_audio.py:16 |
| scaler_a.pkl | Cry/ | cry_router_audio.py:17 |
| model_b_hunger.pkl | Cry/ | cry_router_audio.py:20 |
| scaler_b.pkl | Cry/ | cry_router_audio.py:21 |
| fusion_model_calibrated.pkl | Cry/ | cry_router_fusion.py:14 |
| fusion_label_encoder.pkl | Cry/ | cry_router_fusion.py:15 |
| img_rf_pain_classifier3.pkl | CryTranslater/saved_models/ | cry_router_img.py:22 |
| face_landmarker.task | CryTranslater/Notebooks/ | cry_router_img.py:23 |

### Growth (`mlModels/Growth/`)

| File | Loaded by |
|------|-----------|
| lstm_weight_variantB.pth | growth_router.py:31 |
| scaler_variantB.pkl | growth_router.py:32 |
| rf_risk_2b.pkl | growth_router.py:33 |
| xgb_risk_2a.pkl | growth_router.py:34 |
| rf_anomaly_2a.pkl | growth_router.py:35 |
| xgb_anomaly_2a.pkl | growth_router.py:36 |

### Postpartum (`backEnd/postpartum/models/`)

| File | Loaded by |
|------|-----------|
| perineal_RandomForest.joblib | postpartum/api.py:26 |
| csection_RandomForest.joblib | postpartum/api.py:27 |
| back_pelvic_Ridge.joblib | postpartum/api.py:28 |

---

## 5. Frontend Architecture

### 5.1 Tab Layout (5 tabs)

| Tab | File | Icon | Label |
|-----|------|------|-------|
| Cry Translator | `smart-cry-analysis.tsx` | Mic | Cry |
| Daily Log | `daily-log.tsx` | BookOpen | Log |
| **Home** (center, floating) | `index.tsx` | LayoutDashboard | Home |
| ASD Screening | `asd-screen.tsx` | Brain | ASD |
| Mom's Recovery | `wellness.tsx` | Heart | Mom |

### 5.2 Screen Map

**Auth** (`app/(auth)/`): `sign-in`, `sign-up` (with password strength), `add-infant` (2-step onboarding), `forgot-password`.

**Visible tabs** (`app/(tabs)/`): see 5.1.

**Hidden within tabs (`href: null`):**
- ASD flow: `asd-qchat.tsx` → `asd-qchat-result.tsx` | `asd-research.tsx` → `asd-result.tsx`
- Growth flow: `growth.tsx` → `growth-history.tsx`, `growth-insights.tsx`, `update-measurements.tsx`
- Profile: `Profile.tsx` → `edit-profile.tsx`
- Mom: `recovery.tsx` (full check-in form)
- Stubs: `behavior.tsx`, `explore.tsx`, `cry-translator.tsx` (old)

**Outside tabs group:**
- `mom-prediction-result.tsx` (from recovery)
- `postpartum-dashboard.tsx` (from wellness)
- `postpartum-history.tsx` (from dashboard)

**Legacy stub:** `frontEnd/app/moms-recovery.tsx` just `router.replace('/(tabs)/recovery')` — delete and update callers.

### 5.3 Navigation Patterns

- `router.push()` — go deeper
- `router.back()` — go back (preserves stack)
- `router.replace()` — **only** for auth state changes (sign-in → tabs)

**Current misuses to fix:** `asd-qchat.tsx:94`, `asd-research.tsx:193`, `asd-result.tsx:196`, `asd-qchat-result.tsx:139`, `recovery.tsx:143`, `growth.tsx:163`, `Profile.tsx:97`.

### 5.4 Frontend → Backend Endpoint Reference

| Endpoint | Method | Called from | Purpose |
|----------|--------|------------|---------|
| `/api/asd/status` | GET | — | Health check |
| `/api/asd/predict-face` | POST | asd-research.tsx | Image → P(ASD) |
| `/api/asd/predict-video` | POST | asd-research.tsx | Video → averaged P(ASD) |
| `/api/asd/predict-qchat` | POST | asd-qchat.tsx | Q-CHAT-10 → P(ASD) |
| `/api/asd/predict-fused` | POST | asd-research.tsx | Fusion → risk level |
| `/predict-cry` | POST | analysisService.ts | Audio cry classification |
| `/predict-face` | POST | analysisService.ts | Face emotion/pain |
| `/fusion/predict` | POST | analysisService.ts | Combined cry analysis |
| `/postpartum/predict` | POST | postpartumService.ts | Mom pain prediction |
| `/postpartum/history` | GET | postpartumService.ts | Check-in history |
| `/postpartum/dashboard` | GET | postpartumService.ts | Aggregated stats |
| `/api/growth/dashboard/{id}` | GET | growth.tsx, index.tsx | Growth metrics |
| `/api/growth/history/{id}` | GET | growth-history.tsx | Log history |
| `/api/growth/anomaly-score` | POST | growth-insights.tsx | Anomaly |
| `/feedback` | POST | smart-cry-analysis.tsx | Rating + comment |

### 5.5 Design System — `constants/theme.ts`

**Palette (TinySteps — keep, do not dilute):**
- `background: #FCFBFA` · `primary: #5DA7B1` (teal) · `accent: #E88D72` (coral)
- `success: #82A788` · `warning: #E6A855` · `danger: #D67676`
- `card: #FFFFFF` · `cardSecondary: #F4F1EA` · `label: #2D3132`

**Spacing:** `xs=4, sm=8, md=12, lg=16, xl=20, xxl=24, xxxl=32`
**Border radius:** `sm=8, md=12, lg=16, xl=20, full=999`

**Known theme drift (hardcoded hex to replace):**
- `asd-result.tsx:14-30` — `#34C759`, `#FF9500`, `#FF3B30`, `#007AFF`
- `smart-cry-analysis.tsx:117-127`
- `mom-prediction-result.tsx:91-95` — `#FEE2E2`, `#FEF3C7`, `#D63031`, `#B07D05`

### 5.6 Auth Status (CURRENT)

`lib/auth-context.tsx` uses **real Supabase** for email/password and session handling — `supabase.auth.signInWithPassword`, `signUp`, `getSession`, `onAuthStateChange`, `signOut`. `signInWithGoogle` is still a stub returning `'Google sign-in not yet configured'`. Profile row is fetched from `public.profiles`. The old "mocked auth" note from earlier docs is obsolete.

### 5.7 Services

- `services/analysisService.ts` — cry pipeline, uses `EXPO_PUBLIC_API_BASE_URL`
- `services/postpartumService.ts` — postpartum calls, tries multiple base URLs with 5 s timeout

### 5.8 API URL chaos (to fix)

Currently hardcoded `const API_URL = 'http://localhost:8000/api'`:
- `index.tsx:19`, `asd-qchat.tsx:10`, `asd-research.tsx:21`

Vs `normalizeBaseUrl(EXPO_PUBLIC_API_BASE_URL)` in `smart-cry-analysis`. Vs `REACT_APP_API_BASE_URL` in `analysisService`. Consolidate on one env var and one helper.

---

## 6. Environment Variables

### 6.1 Root `.env` (backend + docker-compose)

| Variable | Read by |
|----------|---------|
| `SUPABASE_URL` | growth_router.py:18, middleware/auth.py:9, database.py |
| `SUPABASE_ANON_KEY` | middleware/auth.py:10 |
| `SUPABASE_SERVICE_ROLE_KEY` | growth_router.py:19, database.py |
| `POSTPARTUM_MONGODB_URI` | postpartum/db.py:26 (preferred; falls back to `MONGODB_URI`) |
| `POSTPARTUM_DB_NAME` | postpartum/db.py:27 (default `TinySteps_db`) |
| `POSTPARTUM_COLLECTION_NAME` | postpartum/db.py:28 (default `postpartum`) |
| `MONGODB_URI` | postpartum/db.py:26 (legacy alias) |

### 6.2 `frontEnd/.env`

| Variable | Used by |
|----------|---------|
| `REACT_APP_API_BASE_URL` | services/analysisService.ts |
| `EXPO_PUBLIC_API_BASE_URL` | smart-cry-analysis.tsx and other screens |
| `EXPO_PUBLIC_SUPABASE_URL` | lib/supabase.ts |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | lib/supabase.ts |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth (planned; currently unused) |

### 6.3 docker-compose.yml pass-throughs

All 7 root `.env` vars are forwarded automatically via `env_file: .env`.

### 6.4 Secrets

Both `.env` files are gitignored — never commit. Share credentials privately. Supabase project ref is in `frontEnd/.env` / root `.env`; do not hardcode it in documentation (earlier docs list two different refs; treat the live `.env` as authoritative).

---

## 7. Supabase Setup

### 7.1 Schema — Canonical source: `SUPABASE_SCHEMA_FIX.sql`

Run the whole file in the Supabase SQL editor (it drops + recreates). 7 tables:

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `profiles` | Extends auth.users | id (FK auth.users), email, full_name, avatar_url, bio |
| `infants` | Baby profile + maternal context | parent_id → profiles, name, dob, gender, weights, maternal_* |
| `measurements` | Growth log | infant_id, measured_date, weight_g, height_cm, head_circ_cm |
| `asd_predictions` | Saved ASD results | infant_id, facial/qchat/fused scores, risk level |
| `daily_logs` | Sleep/feed/illness/nutrition | infant_id, log_date, payload |
| `postpartum_checkins` | Mom pain check-ins | user_id, scores, model outputs |
| `feedback` | User ratings | user_id, rating, comment |

Older migrations under `supabase/migrations/` (`001_auth_setup.sql`, `002_asd_setup.sql`) pre-date the schema fix and use different columns (e.g., `role` on profiles). **Prefer `SUPABASE_SCHEMA_FIX.sql`** for a clean setup; the migrations are kept for history.

### 7.2 `profiles` auto-creation trigger

Required so a `profiles` row exists for every new auth user (frontend `auth-context.tsx` assumes it):

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 7.3 RLS

Every table has `auth.uid()`-scoped policies. Typical pattern:
```sql
alter table public.infants enable row level security;
create policy "Parents see own infants" on public.infants
  for select using (auth.uid() = parent_id);
-- …insert/update/delete with same USING/WITH CHECK
```
Full policies are in `SUPABASE_SCHEMA_FIX.sql`.

### 7.4 Storage

Create a **private** bucket `asd-frames` (Supabase dashboard → Storage). Used by `/api/asd/predict-video` to persist sampled frames. Current implementation uploads to a public-readable path — review before production (PII).

### 7.5 Auth configuration

- Enable **Email** provider (Authentication → Providers)
- **URL Configuration** for Expo dev: site URL `exp://localhost:8081`, redirect allow-list includes `exp://`, `tinysteps://`, and the production scheme
- **Google provider** — see §9

### 7.6 Client setup

`frontEnd/lib/supabase.ts` already uses `AsyncStorage` as the session store (`@react-native-async-storage/async-storage`) and imports `react-native-url-polyfill/auto`. If either dep is missing from `package.json`, install them.

---

## 8. Docker Setup

### 8.1 Current state (already fixed)

`backEnd/Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 ffmpeg \
    && rm -rf /var/lib/apt/lists/*
COPY backEnd/requirements.txt ./backEnd/
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --timeout 600 --retries 10 -r backEnd/requirements.txt
COPY backEnd/ ./backEnd/
COPY mlModels/ ./mlModels/
WORKDIR /app/backEnd
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**What was fixed:** Windows `ffmpeg.exe` is stripped via `.dockerignore` and replaced by apt `ffmpeg`. The previously-empty `wheels/` step was removed; torch installs from PyPI via `requirements.txt`.

`.dockerignore` already excludes: `.env`, `frontEnd/`, `backEnd/ffmpeg.exe`, `backEnd/mlModels/` (duplicate), `backEnd/wheels/`, postpartum training data (`postpartum_dataset.*`, `postpartum_pipeline.py`, `painpredict.py`), `__pycache__`, and all `*.md` except `backEnd/README.md`.

### 8.2 docker-compose.yml

Single `backend` service, `.env` passthrough, port `8000:8000`. Dev hot-reload volumes are commented out (uncomment for local dev).

### 8.3 Build & run

```bash
# On Windows cmd/PowerShell
set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

docker-compose up --build -d
docker-compose logs -f backend
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
```

### 8.4 Smoke-test endpoints

```bash
curl http://localhost:8000/openapi.json          # all routes present
curl http://localhost:8000/api/asd/status        # ASD model load
curl http://localhost:8000/fusion/health         # cry fusion
# predict-qchat, predict-fused, postpartum/predict, growth/anomaly-score — use /docs
```

### 8.5 Teammates — minimal setup

```bash
git clone <repo-url>
# Place root .env (shared privately)
docker-compose up -d

# Frontend separately:
cd frontEnd && npm install && npx expo start
```

---

## 9. Google OAuth (Stub)

`signInWithGoogle` currently returns an error. To enable:

1. **Google Cloud Console** → create OAuth Client ID (Web type) → copy client ID + secret.
2. **Supabase dashboard** → Authentication → Providers → Google → paste ID/secret → enable.
3. **Supabase URL config** → add redirect URLs `tinysteps://auth/callback` and `exp://localhost:8081/--/auth/callback`.
4. **Frontend** — install `expo-web-browser` + `expo-linking`, set `"scheme": "tinysteps"` in `app.json`, and replace the stub in `lib/auth-context.tsx`:
   ```ts
   const redirectTo = Linking.createURL('/auth/callback');
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: { redirectTo, skipBrowserRedirect: true },
   });
   if (data?.url) await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
   ```
5. **Env:** set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

Full walkthrough in the former `GOOGLE_OAUTH_SETUP.md` (now absorbed here) — refer to the commit history if you need step-by-step screenshots.

---

## 10. Known Issues & Prioritized Fix List

### 10.1 Critical — navigation / routing bugs

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | `wellness → moms-recovery` broken | `wellness.tsx:53` | Route to `/(tabs)/recovery` |
| 2 | `Done` on ASD results → stub | `asd-result.tsx`, `asd-qchat-result.tsx` | Route to `/(tabs)/asd-screen` |
| 3 | `postpartum-history` no back button | `postpartum-history.tsx` | Already has back button — verify UX Audit intent |
| 4 | `router.replace` misuse (7 sites) | see §5.3 | Replace with `router.back()` or `push()` |

### 10.2 Backend — security & correctness

| # | Issue | Severity | Where |
|---|-------|----------|-------|
| 1 | No auth enforced on any route (`require_auth` unused) | **HIGH** | all routers |
| 2 | IDOR on `/api/growth/dashboard/{infant_id}` — no ownership check | **HIGH** | growth_router.py |
| 3 | `asd-frames` bucket currently public / no TTL | **HIGH** | asd_router.py video upload |
| 4 | Client-supplied `p_qchat` trusted in `/predict-fused` without recomputation | Medium | asd_router.py |
| 5 | `/postpartum/history DELETE` unrestricted (no auth, no user_id filter) | **HIGH** | postpartum/api.py |
| 6 | Mongo docs in `postpartum` + `Discomfort` have no `user_id` field | Medium | postpartum/db.py, feedback_router.py |
| 7 | `FRAME_STEP = 3` is per-frame, not per-second as docstring claims (sparse sampling) | Medium | asd_router.py |
| 8 | Video endpoint has no size limit / no frame-quality filter; falls back to raw frame if MTCNN fails | Medium | asd_router.py |
| 9 | `FACIAL_THRESHOLD=0.06` is extreme (almost always predicts ASD); fusion compensates | Low | asd_router.py |
| 10 | WAZ uses 13-point interpolation + `sd ≈ median × 0.13` instead of WHO LMS params | Medium | growth_router.py:151-160 |
| 11 | LSTM stub returns hardcoded 14.5 g/day + 0.11 cm/wk when model path missing — silent | Medium | growth_router.py |
| 12 | Growth-alert insert has no dedup → duplicates per refresh | Medium | growth_router.py:557-565 |
| 13 | SHAP `LinearExplainer` rebuilt per request | Low | postpartum/api.py:191 |
| 14 | `weeks_since_delivery < 6` rule nested inside feature loop (fires 3×) | Low | postpartum/api.py:117 |
| 15 | `cry_router_audio.py` calls `file.read()` twice (L89 + L117) | Low | — |
| 16 | `session_id: "API_REQUEST"` constant could be a training-time leak | Medium | cry_router_fusion.py:78 |
| 17 | `face_landmarker.task` auto-downloads at startup — fails air-gapped | Medium | cry_router_img.py |
| 18 | `database.supabase` returns `None` on missing env; not all routers handle this | Low | database.py |

### 10.3 Frontend polish (from UX audit)

**Priority 2 — consistency:**
- Consolidate API URL: drop hardcoded `localhost:8000` in `index.tsx:19`, `asd-qchat.tsx:10`, `asd-research.tsx:21`, `growth.tsx:19`
- Unify back-button style (ChevronLeft pill vs `← Back` text) across all detail screens
- Fix the 7 `router.replace` misuses

**Priority 3 — Q-CHAT-10 screen refinements:**
- Pill min-height 44 px (current mixed)
- Progress bar thickness 3 → 7 px
- Add ✓ icon on selected pill
- Section divider with "Two more quick questions" header
- Dynamic submit button label ("Next" / "Finish & see result")

**Priority 4 — theme drift & chrome:**
- Replace all hardcoded iOS-style hex with theme tokens (`#34C759` → `Colors.light.success`, etc.)
- Fix `theme.ts`: `labelSecondary === label` hex collision
- Unify splash background with app `background` token
- `recovery.tsx` has `parenting_type: 'partner'` hardcoded at L107 — make a prompt

**Priority 5 — dark mode:**
- Not implemented. 27 files use the `Colors.light` namespace directly. Needs `useColorScheme()` or theme context.

### 10.4 Cleanup (non-blocking)

| Item | Recommendation |
|------|---------------|
| `backEnd/ffmpeg.exe` | Keep for local Windows dev; already excluded from Docker |
| `backEnd/mlModels/` | Delete — duplicate of root `mlModels/`; excluded from Docker |
| `backEnd/wheels/` | Delete — empty, no longer referenced |
| `backEnd/postpartum/postpartum_dataset.xlsx` / `.csv` / `postpartum_pipeline.py` / `painpredict.py` | Move to a `research/` folder or gitignore |
| Legacy stub `frontEnd/app/moms-recovery.tsx` | Delete; update callers to `/(tabs)/recovery` |

---

## 11. Local Dev Setup (Yasindu)

For testing without Docker, use the `asdTf01` conda env:

- **Env:** `asdTf01` (Python 3.9, TF 2.20.0)
- **Python path:** `C:/Users/Yasindu/.conda/envs/asdTf01/python.exe`
- **Pre-installed:** tensorflow 2.20, tf_keras, mtcnn, opencv-python, supabase, pandas, numpy

**Extra pip installs:**
```bash
C:/Users/Yasindu/.conda/envs/asdTf01/Scripts/pip.exe install \
  fastapi "uvicorn[standard]" pydantic python-dotenv joblib \
  scikit-learn python-multipart xgboost supabase torch pymongo
```

**Start backend:**
```bash
cd backEnd
C:/Users/Yasindu/.conda/envs/asdTf01/python.exe -m uvicorn app:app --host 0.0.0.0 --port 8000
```

**Note:** `app.py` imports all 7 routers directly. All deps must be installed or startup fails. For ASD-only testing you can temporarily wrap non-ASD imports in try/except, but **do not commit** that change.

---

## 12. Git Notes

- `.h5` gitignored (too large)
- `.pkl` tracked (all < 500 KB)
- `.gitattributes` has LFS rules for `.h5`, `.keras`, `.exe`, `.zip`, `.task`, `.joblib`
- `ffmpeg.exe` (95 MB) is in `backEnd/` — tracked via LFS (`.exe` rule)
- `.env` and `*.env` gitignored
- Full research history: `C:\Users\Yasindu\Desktop\Stuff\1.SLIIT\Research\Project\infant-growth-monitoring-system\` (branch `asd-research`)
