# PROJECT_DESIGN.md — Infant Growth Monitoring System

> **Generated:** Read-only codebase audit  
> **Scope:** backEnd/, frontEnd/, mlModels/  

---

## A. Current-State Summary

### What exists and works end-to-end today

| Layer | Component | Status | Notes |
|-------|-----------|--------|-------|
| **Backend** | FastAPI server (`app.py`) | **Runnable** | Mounts 4 router groups on port 8000 |
| **Backend** | Cry Audio router (`/predict-cry`) | **Working** | Two-stage GradientBoosting (pain → hunger/normal), 355 features |
| **Backend** | Face Image router (`/predict-face`) | **Working** | MediaPipe landmarks + Random Forest (EAR, MAR, brow) |
| **Backend** | Fusion router (`/fusion/predict`) | **Working** | Calibrated ML model; audio + image + context → cry reason |
| **Backend** | Postpartum router (`/postpartum/*`) | **Working** | 3 pain models (perineal, csection, back_pelvic) + SHAP + MongoDB |
| **Frontend** | Expo/React Native app (TinySteps) | **Runnable** | 8 tabs, 12+ screens, Expo Router file-based navigation |
| **Frontend** | Cry translator screens | **Working** | Audio recording, image capture, fusion with context form |
| **Frontend** | Mom's recovery form + results | **Working** | 17-field form → postpartum API → risk cards + guidance |
| **Frontend** | Postpartum dashboard | **Working** | Fetches history, computes trends/insights client-side |
| **ML Training** | Sector 1 (Facial ASD) | **Trained** | VGG-Face CNN, 5-fold, fine-tuned; LogReg probe saved |
| **ML Training** | Sector 2 (Q-CHAT ASD) | **Trained** | XGBoost, 3 stages (baseline → ablation → parent-only) |
| **ML Training** | Sector 3 (Late Fusion Sim) | **Simulated** | Monte Carlo α-sweep; optimal α=0.15, fused AUC=0.9994 |
| **ML Training** | CryTranslater notebooks | **Trained** | Audio CNN, image RF, fusion model; saved_models/ populated |

### What is partially built or stubbed

| Component | Status | Gap |
|-----------|--------|-----|
| `services/analysisService.ts` | **Empty file** | Cry/face API calls live inline in screen components |
| `app/postpartum-history.tsx` | **Stub** | Title + description only; no data fetching |
| `app/(tabs)/Profile.tsx` | **Hardcoded** | Dummy avatar/name/email; Edit/Logout non-functional |
| `app/(tabs)/edit-profile.tsx` | **Broken import** | References `lib/supabase` which does not exist |
| Behavior/Growth tabs | **Placeholder** | Info text only; no ML integration |
| Auth (Appwrite) | **Configured** | Provider wraps app but no screens enforce auth |
| Supabase integration | **Partial** | Referenced in edit-profile but client library not set up |

### What does NOT exist yet

- **ASD detection endpoint** — No backend route serves the facial CNN or Q-CHAT model
- **ASD detection frontend** — No screen captures infant photo or Q-CHAT form for ASD prediction
- **Growth forecasting ML** — No model, no endpoint, no screen beyond placeholder
- **Behavior screening ML** — No model, no endpoint, no screen beyond placeholder
- **User authentication flow** — No login/signup screens; Appwrite context unused
- **Supabase client library** — `lib/supabase.ts` missing; edit-profile will crash

---

## B. Backend Architecture

### Entry Point

[backEnd/app.py](backEnd/app.py) — FastAPI, CORS `allow_origins=["*"]`, port 8000

```
backEnd/
├── app.py                      # FastAPI init, router mounts, CORS
├── .env                        # MongoDB URI + DB name (postpartum)
├── requirements.txt            # 70+ packages (FastAPI, librosa, MediaPipe, TF, sklearn, etc.)
├── routers/
│   ├── cry_router_audio.py     # POST /predict-cry   — Audio classification
│   ├── cry_router_img.py       # POST /predict-face   — Facial pain detection
│   └── cry_router_fusion.py    # POST /fusion/predict — Multi-modal fusion
├── postpartum/
│   ├── __init__.py             # Exports router from api.py
│   ├── api.py                  # POST /postpartum/predict, GET /history, /dashboard, DELETE /history
│   ├── db.py                   # MongoDB lazy connection with 30s cooldown
│   ├── painpredict.py          # Standalone prediction script (not served)
│   ├── postpartum_pipeline.py  # Training pipeline (Ridge, RF, XGBoost per pain type)
│   └── models/                 # 3 joblib models (see Section D)
├── mlModels/Cry/               # 9 model artifacts for cry analysis (see Section D)
└── tmp/                        # Auto-created temp dir for uploaded audio files
```

### Endpoint Map

| Method | Path | Router File | Request | Response | Models Used |
|--------|------|-------------|---------|----------|-------------|
| GET | `/` | app.py | — | `{status, message}` | — |
| POST | `/predict-cry` | cry_router_audio.py | `UploadFile` (audio) | `{label, confidence, debug_info}` | model_a_pain.pkl, model_b_hunger.pkl, scaler_a.pkl, scaler_b.pkl |
| POST | `/predict-face` | cry_router_img.py | `UploadFile` (image) | `{label, confidence, pain_probability, features}` | img_rf_pain_classifier3.pkl, face_landmarker.task |
| POST | `/fusion/predict` | cry_router_fusion.py | JSON body (9 fields) | `{predicted_cry_reason, confidence, confidence_level, all_class_probabilities}` | fusion_model_calibrated.pkl, fusion_label_encoder.pkl |
| POST | `/postpartum/predict` | postpartum/api.py | JSON body (17 fields) | `{predictions, top_factors, guidance}` | perineal_RF.joblib, csection_RF.joblib, back_pelvic_Ridge.joblib |
| GET | `/postpartum/history` | postpartum/api.py | `?limit=20` | `[{id, created_at, input, predictions, guidance}]` | — |
| GET | `/postpartum/dashboard` | postpartum/api.py | `?days=30` | `{total_records, avg_scores, risk_distribution, trend}` | — |
| GET | `/postpartum/health` | postpartum/api.py | — | `{status, models_loaded, db_connected}` | — |
| DELETE | `/postpartum/history` | postpartum/api.py | — | `{message, deleted_count}` | — |

### Audio Pipeline Detail (cry_router_audio.py, 338 lines)

Two-stage GradientBoosting:
1. **Stage 1 (Model A):** Pain (1) vs No-Pain (0)
2. **Stage 2 (Model B):** Hunger (1) vs Normal (0) — only when Stage 1 = No-Pain

Feature extraction (355 dims): MFCC mean/std (80) + Mel mean/std (256) + Chroma mean (12) + Spectral Contrast mean (7). Audio loaded at 22050 Hz, 5s max, noise-reduced via noisereduce.

### Face Pipeline Detail (cry_router_img.py, 241 lines)

MediaPipe Face Landmarker → 3 features (avg EAR, MAR, brow_score) → Random Forest. Auto-downloads face_landmarker.task if missing.

### Fusion Pipeline Detail (cry_router_fusion.py, 159 lines)

Pydantic-validated input (baby_age, audio/image predictions+confidence, feeding/sleep/diaper/temperature). Adds computed `model_disagreement` and `ambiguous_case` booleans. Calibrated sklearn model predicts cry reason label with probability.

### Postpartum Pipeline Detail (postpartum/api.py, 302 lines)

17-field MotherInput → 3 pain score predictions (perineal, c-section, back/pelvic) via scikit-learn Pipelines. SHAP LinearExplainer on back_pelvic model extracts top-3 positive contributors → generates personalized guidance. Results stored in MongoDB (`TinySteps_db.postpartum`).

### External Dependencies

- **MongoDB Atlas** — Postpartum history storage (URI in .env)
- **ffmpeg** — Required on PATH for librosa audio decoding
- **face_landmarker.task** — Downloaded from Google Storage on first use

---

## C. Frontend Architecture

### App Identity

- **Name:** TinySteps (BabySense AI)
- **Framework:** Expo SDK 54, React Native 0.81, Expo Router 6 (file-based)
- **Auth:** Appwrite (react-native-appwrite) — initialized but not enforced
- **Styling:** Custom theme system (theme.ts), no external UI library

### Navigation Tree

```
app/_layout.tsx (Root Stack — ThemeProvider + AuthProvider)
│   anchor: "disclaimer"
│
├── disclaimer.tsx                  → Accept → (tabs)
│
├── (tabs)/_layout.tsx (Bottom Tab Bar — 6 visible tabs)
│   ├── index.tsx                   Home grid: 4 feature cards
│   ├── cry-translator.tsx          Audio/Face/Fusion analysis
│   ├── behavior.tsx                Behavior info (placeholder)
│   ├── growth.tsx                  Growth info (placeholder)
│   ├── recovery.tsx                Postpartum form → predict
│   ├── Profile.tsx                 Static profile display
│   ├── edit-profile.tsx            Edit profile (broken Supabase import)
│   └── explore.tsx                 App info screen
│
├── smart-cry-analysis.tsx          Full cry analysis with context form
├── cry-translator-simple.tsx       Simpler cry analysis (3 modes)
├── babysense-home.tsx              Landing/intro screen
├── advanced-testing.tsx            4 testing mode cards
├── growth-forecaster.tsx           Growth placeholder
├── behavior-development.tsx        Behavior placeholder
├── moms-recovery.tsx               Redirect → recovery tab
├── mom-prediction-result.tsx       Postpartum result cards
├── postpartum-dashboard.tsx        Recovery trends & insights
├── postpartum-history.tsx          Stub (not implemented)
└── modal.tsx                       Generic modal
```

### Screen → API Wiring

| Screen | API Calls | Backend Endpoints |
|--------|-----------|-------------------|
| `cry-translator.tsx` | Audio upload, Face upload, Fusion JSON | `/predict-cry`, `/predict-face`, `/fusion/predict` |
| `smart-cry-analysis.tsx` | Audio upload, Face upload, Fusion JSON | `/predict-cry`, `/predict-face`, `/fusion/predict` |
| `cry-translator-simple.tsx` | Audio upload, Face upload, Fusion JSON | `/predict-cry`, `/predict-face`, `/fusion/predict` |
| `recovery.tsx` | Submit form, Fetch history | `/postpartum/predict`, `/postpartum/history` |
| `postpartum-dashboard.tsx` | Fetch all history | `/postpartum/history` |
| `mom-prediction-result.tsx` | None (receives data via route params) | — |
| `behavior.tsx` | None | — |
| `growth.tsx` | None | — |
| `Profile.tsx` | None | — |
| `edit-profile.tsx` | Supabase query (broken) | — |

### API Base URLs

- Hardcoded in screen files: `http://192.168.8.119:8000` and `http://localhost:8000`
- `postpartumService.ts` auto-discovers base URL via ordered fallback:
  - `EXPO_PUBLIC_API_URL` env var
  - Web: `localhost:8000`, `127.0.0.1:8000`
  - Android: `10.0.2.2:8000`, `localhost:8000`, `127.0.0.1:8000`, `192.168.8.119:8000`

### Services

| File | Status | Purpose |
|------|--------|---------|
| `services/postpartumService.ts` | **Working** | API client with URL auto-discovery, AsyncStorage cache, typed request/response |
| `services/analysisService.ts` | **Empty** | Intended for cry/face API abstraction; all calls are inline in screens |

### Auth Setup

- `lib/appwrite.ts` — Initializes Appwrite Client, exports `account` and `databases`
- `lib/auth-context.tsx` — React context with `signUp`, `signIn`, `signOut`, `user` state
- **Not enforced:** No route guards, no login screen exists, no user data used in API calls

### Key Frontend Dependencies (package.json)

| Package | Purpose |
|---------|---------|
| expo ~54.0.25 | Core framework |
| expo-router ~6.0.15 | File-based navigation |
| expo-av ~16.0.8 | Audio recording/playback |
| expo-image-picker ~17.0.10 | Camera/gallery access |
| react-native-appwrite ^0.25.0 | Auth client |
| @supabase/supabase-js ^2.98.0 | DB client (unused beyond edit-profile) |
| @react-native-picker/picker ^2.11.4 | Dropdown selectors |
| @react-native-community/slider 5.0.1 | Slider inputs |

---

## D. ML Model Artifacts — Verified Inventory

### ASD Detection (mlModels/autisumDetect/)

#### Sector 1 — Facial Image Analysis (VGG-Face CNN → LogReg Probe)

| Artifact | Path | Size | Status |
|----------|------|------|--------|
| VGG-Face fold-5 CNN | sector1/Stage_4/models/fold_5_best.h5 | 665.8 MB | **EXISTS** |
| LogReg probe model | sector1/Stage_4/models/logreg_probe_model.pkl | 2.8 KB | **EXISTS** |
| LogReg probe scaler | sector1/Stage_4/models/logreg_probe_scaler.pkl | 6.6 KB | **EXISTS** |
| Extracted features | sector1/Stage_4/data/ImgFeatures_Stage4.csv | 8.5 MB | **EXISTS** |
| All 5 fold CNNs | sector1/Stage_4/models/fold_{1..5}_best.h5 | ~665 MB each | **EXISTS** |
| Phase 1+2 variants | sector1/Stage_4/models/fold_{1..5}_p{1,2}_best.h5 | — | **EXISTS** |

**Pipeline:** Input image → VGG-Face CNN (frozen base, custom head) → 2048-dim embedding → StandardScaler → LogReg binary probe → ASD probability  
**Full-dataset AUC:** 0.9032 | **OOF AUC:** 0.8593

#### Sector 2 — Q-CHAT-10 Questionnaire (XGBoost)

| Artifact | Path | Size | Status |
|----------|------|------|--------|
| XGBoost Stage 2 model | sector2/Stage_2/models/xgboost_qchat_stage2.pkl | 287.4 KB | **EXISTS** |
| Feature columns | sector2/Stage_2/models/qchat_feature_columns.pkl | 101 B | **EXISTS** |
| Probability outputs | sector2/Stage_2/data/qchat_probabilities_stage2.csv | 36.5 KB | **EXISTS** |

**Stage evolution:** Stage 0 (15 features, 7530 rows, AUC 0.9966) → Stage 1 (12 features, ablated who-columns, AUC 0.9956) → Stage 2 (parent-only filter, 1838 rows, AUC 0.9769) ← **production model**

#### Sector 3 — Late Fusion Simulation

| Artifact | Path | Size | Status |
|----------|------|------|--------|
| Simulation results | sector3/results/fusion_simulation_summary.json | 17.1 KB | **EXISTS** |

**Key results:** Optimal α=0.15 (85% Q-CHAT, 15% facial), fused AUC=0.9994, AUC gain=+0.0003 over Q-CHAT alone, irreducible both-FN rate=0.2%

### Cry Analysis (backEnd/mlModels/Cry/)

| Artifact | Size | Used By |
|----------|------|---------|
| model_a_pain.pkl | 812 KB | cry_router_audio.py — Stage 1 pain detector |
| model_b_hunger.pkl | 812 KB | cry_router_audio.py — Stage 2 hunger detector |
| scaler_a.pkl | 14.2 KB | cry_router_audio.py — Feature scaler A |
| scaler_b.pkl | 14.2 KB | cry_router_audio.py — Feature scaler B |
| feature_columns.pkl | 4.9 KB | cry_router_audio.py — 355 column names |
| img_rf_pain_classifier3.pkl | 3.5 MB | cry_router_img.py — Face pain RF |
| face_landmarker.task | 3.8 MB | cry_router_img.py — MediaPipe model |
| fusion_model_calibrated.pkl | 12.5 MB | cry_router_fusion.py — Fusion classifier |
| fusion_label_encoder.pkl | 512 B | cry_router_fusion.py — Label encoder |

### Cry Analysis Training (mlModels/CryTranslater/saved_models/)

| Artifact | Size | Notes |
|----------|------|-------|
| audio_pain_model1.pkl | 3.6 MB | GradientBoosting audio |
| audio_pain_model2.pkl | 793 KB | Variant |
| audio_pain_model3.pkl | 793 KB | Variant |
| audio_pain_model4.pkl | 814 KB | Variant (deployed as model_a/b) |
| cnn_cry_model_v2.h5 | 1.3 MB | CNN audio model |
| fusion_model_calibrated.pkl | 12.5 MB | Same as deployed copy |
| img_rf_pain_classifier3.pkl | 3.5 MB | Same as deployed copy |
| pain_recognition_model.pkl | 2.2 MB | Alternative pain model |
| pain_scaler.pkl | 759 B | Pain feature scaler |
| scaler.pkl | 6.5 KB | General scaler |
| fusion_label_encoder.pkl | 512 B | Same as deployed copy |

### Postpartum Models (backEnd/postpartum/models/)

| Artifact | Size | Algorithm |
|----------|------|-----------|
| perineal_RandomForest.joblib | 21.2 MB | RandomForestRegressor |
| csection_RandomForest.joblib | 10.1 MB | RandomForestRegressor |
| back_pelvic_Ridge.joblib | 8.0 KB | Ridge Regression |

---

## E. Gap Analysis

### GAP-1: ASD Detection Not Integrated

**Impact: Critical** — The core research contribution (facial + Q-CHAT ASD screening) has no backend endpoint and no frontend screen.

- **What exists:** Trained models (VGG-Face CNN, LogReg probe, XGBoost Q-CHAT), saved artifacts, fusion simulation
- **What's missing:**
  - Backend router to load `fold_5_best.h5` + `logreg_probe_model.pkl` → accept image → return ASD probability
  - Backend router to load `xgboost_qchat_stage2.pkl` → accept Q-CHAT-10 answers → return ASD probability
  - Backend route for late fusion (α-weighted combination)
  - Frontend screen for infant photo capture → ASD prediction display
  - Frontend screen for Q-CHAT-10 questionnaire form → ASD prediction display
  - Frontend screen for combined ASD result with confidence

### GAP-2: Growth Forecasting Module Empty

**Impact: High** — Tab exists in navigation but has no ML model, no endpoint, no functional screen.

- `app/(tabs)/growth.tsx` and `app/growth-forecaster.tsx` are info-only placeholders
- No growth-related model in mlModels/ or backEnd/

### GAP-3: Behavior Screening Module Empty

**Impact: High** — Tab exists but is placeholder only.

- `app/(tabs)/behavior.tsx` and `app/behavior-development.tsx` are info-only
- No behavior-related model or endpoint

### GAP-4: Authentication Not Enforced

**Impact: Medium** — Appwrite is configured (`lib/appwrite.ts`, `lib/auth-context.tsx`) but:

- No login/signup screens exist
- No route guards protect any screen
- No user ID is passed to any API call
- Postpartum history is unscoped (all users share one collection)

### GAP-5: edit-profile.tsx Broken Import

**Impact: Medium** — References `lib/supabase` which does not exist in the codebase.

- Will crash on navigation to edit-profile tab
- Supabase client (`@supabase/supabase-js`) is in package.json but no initialization file

### GAP-6: API Service Layer Incomplete

**Impact: Low-Medium** — `services/analysisService.ts` is empty.

- Cry/face/fusion API calls are duplicated inline across 3 screens (`cry-translator.tsx`, `smart-cry-analysis.tsx`, `cry-translator-simple.tsx`)
- Backend URL hardcoded as `http://192.168.8.119:8000` in some screens
- Only `postpartumService.ts` has proper URL discovery and caching

### GAP-7: Hardcoded Backend URLs

**Impact: Low** — Multiple screens hardcode `192.168.8.119:8000`. Will break on different networks.

### GAP-8: CORS Wildcard

**Impact: Low (dev only)** — `allow_origins=["*"]` is fine for development but should be restricted for production.

### GAP-9: No Error Boundary / Offline Handling for Cry Analysis

**Impact: Low** — Unlike postpartumService.ts (which has AsyncStorage cache), cry analysis screens have no offline fallback.

---

## F. Integration Checklist

### F.1 — ASD Facial Endpoint

- [ ] Create `backEnd/routers/asd_facial_router.py`
- [ ] Load `fold_5_best.h5` (or ensemble) + `logreg_probe_scaler.pkl` + `logreg_probe_model.pkl`
- [ ] Accept image upload → preprocess (224×224, VGGFace preprocess) → CNN forward pass → extract embedding → scale → LogReg predict
- [ ] Return `{asd_probability, label, confidence}`
- [ ] Mount in `app.py` with prefix `/asd`
- [ ] Verify TensorFlow/Keras version compatible with saved .h5

### F.2 — ASD Q-CHAT Endpoint

- [ ] Create `backEnd/routers/asd_qchat_router.py`
- [ ] Load `xgboost_qchat_stage2.pkl` + `qchat_feature_columns.pkl`
- [ ] Accept JSON with 10 Q-CHAT-10 answers (+ optional demographics)
- [ ] Construct DataFrame with exact feature column order
- [ ] Return `{asd_probability, label, confidence}`
- [ ] Mount in `app.py`

### F.3 — ASD Late Fusion Endpoint (optional)

- [ ] Accept both facial probability and Q-CHAT probability
- [ ] Compute `fused = α * p_facial + (1 - α) * p_qchat` with α=0.15
- [ ] Return `{fused_probability, recommended_label, facial_weight, qchat_weight}`

### F.4 — ASD Frontend Screens

- [ ] Photo capture screen (infant face) → call facial endpoint → display result
- [ ] Q-CHAT-10 form screen (10 questions) → call Q-CHAT endpoint → display result
- [ ] Combined result screen with fusion probability and confidence level
- [ ] Add navigation entries to home grid and/or tab bar

### F.5 — Fix edit-profile.tsx

- [ ] Create `frontEnd/lib/supabase.ts` with proper initialization, OR
- [ ] Remove Supabase dependency and use Appwrite databases instead

### F.6 — Create analysisService.ts

- [ ] Extract cry/face/fusion API calls from inline screens
- [ ] Add URL auto-discovery (matching postpartumService.ts pattern)
- [ ] Update 3 cry analysis screens to use the service

### F.7 — Authentication Flow

- [ ] Create login/signup screens
- [ ] Add route guards (redirect to login if no session)
- [ ] Pass user ID to postpartum API for per-user history scoping

### F.8 — Implement postpartum-history.tsx

- [ ] Fetch data via `getPostpartumHistory()`
- [ ] Display list of past assessments with scores and dates

---

## G. Recommended Build Order

### Phase 1 — Quick Wins (fix broken things)

1. **Fix edit-profile import** — Create `lib/supabase.ts` or swap to Appwrite
2. **Extract analysisService.ts** — Centralize cry/face/fusion API calls, remove hardcoded IPs
3. **Implement postpartum-history.tsx** — Data fetching already available via service

### Phase 2 — ASD Backend (core research value)

4. **ASD Facial endpoint** — Load CNN + probe, serve predictions at `/asd/predict-face`
5. **ASD Q-CHAT endpoint** — Load XGBoost, serve predictions at `/asd/predict-qchat`
6. **ASD Fusion endpoint** — α-weighted combination at `/asd/predict-fused`
7. **Test all 3 endpoints** — Verify model loading, inference accuracy, response format

### Phase 3 — ASD Frontend

8. **Q-CHAT-10 form screen** — 10-question form → call endpoint → display risk
9. **Infant photo capture screen** — Camera/gallery → call facial endpoint → display result
10. **Combined ASD result screen** — Show fusion result with breakdown
11. **Wire into navigation** — Add entries to home grid, tab bar, or dedicated section

### Phase 4 — Hardening

12. **Add authentication** — Login/signup screens, route guards, per-user data scoping
13. **Restrict CORS** — Replace wildcard with specific frontend origins
14. **Environment config** — Move all base URLs to env vars, remove hardcoded IPs
15. **Offline handling** — Add AsyncStorage caching to cry analysis (match postpartum pattern)

### Phase 5 — Growth & Behavior (future)

16. **Growth forecasting** — Requires ML model development, endpoint, and screen
17. **Behavior screening** — Requires ML model development, endpoint, and screen

---

## Appendix: File Counts

| Directory | Files | Lines (approx) |
|-----------|-------|-----------------|
| backEnd/ (Python source) | 8 .py files | ~1,500 |
| backEnd/mlModels/Cry/ | 9 model files | — |
| backEnd/postpartum/models/ | 3 joblib files | — |
| frontEnd/app/ | ~22 .tsx screens | ~5,000+ |
| frontEnd/components/ | 10 .tsx components | ~800 |
| frontEnd/services/ | 2 .ts files (1 empty) | ~250 |
| frontEnd/lib/ | 2 files (appwrite + auth) | ~110 |
| mlModels/autisumDetect/ | ~30 notebooks + 15 artifacts | — |
| mlModels/CryTranslater/ | ~15 notebooks + 13 artifacts | — |
