# CLAUDE.md — TinySteps Infant Growth Monitoring System

## Project Overview
SLIIT final-year research project. Multi-modal infant care app with 4 ML components built by a team. This repo is the **production app** on branch `frontend-fix`.

**Tech stack:** FastAPI (Python backend) + React Native / Expo 54 (frontend) + Supabase + MongoDB

## Repository Layout
```
backEnd/
  app.py                          # FastAPI entry, port 8000, CORS, 7 routers
  requirements.txt                # Python deps (TF 2.20, XGBoost 3.2, sklearn 1.8, etc.)
  routers/
    asd_router.py                 # ASD detection (Yasindu's component)
    cry_router_audio.py           # Cry classification (audio)
    cry_router_img.py             # Cry facial pain detection
    cry_router_fusion.py          # Cry multi-factor fusion
    growth_router.py              # Growth forecasting (LSTM + risk)
    feedback_router.py            # User feedback
  postpartum/
    api.py                        # Mom's recovery pain prediction
  mlModels/
    autisumDetect/                # ASD research artifacts (see below)
    Cry/                          # Cry analysis models

frontEnd/
  app/(tabs)/                     # 5-tab layout: Cry | Log | Home | ASD | Mom
  constants/theme.ts              # TinySteps design system
  lib/supabase.ts                 # Supabase client (STUB credentials)
  services/                       # API clients

supabase/migrations/
  001_auth_setup.sql              # profiles, infants, RLS
  002_asd_setup.sql               # asd_predictions, asd-frames bucket
```

## ASD Detection System (Yasindu's Research)

### Research Artifacts Location
All research notebooks, plots, models, and data are in:
`backEnd/mlModels/autisumDetect/{sector1, sector2, sector3}/`

### Architecture — Three Sectors

**Sector 1 — Facial Image Pipeline (VGG-Face CNN)**
- Prep: MTCNN face detection + MD5 dedup + augmentation -> 3,917 images
- Stage_1: Baseline frozen VGG-Face (best 83.07%)
- Stage_2: 5-fold CV, blind test 76.02%, ASD recall 59%
- Stage_3: 256-D embedding extraction
- Stage_4: Phase 1 frozen + Phase 2 fine-tune (regressed to 67.1%)
- LogReg probe on embeddings: AUC 0.8593 (beats NN head at 0.7626)

**Sector 2 — Q-CHAT-10 Questionnaire Pipeline (XGBoost)**
- Stage_0: 5-dataset merge (7,530 rows), XGBoost 94.56%
- Stage_1: Ablation proving Who_completed_test = population bias
- Stage_2 (Production): Parent-only filter (1,838 rows), XGBoost 96.20%, AUC 0.9769

**Sector 3 — Late Fusion Simulation**
- Monte Carlo: 500 iter x 300 pairs, alpha sweep 0.00-1.00
- Optimal alpha=0.15 (AUC 0.9994)
- Joint FN rate: 0.23% (complementarity is the real contribution)

### Critical VGG-Face Preprocessing (MUST match train/eval/inference)
- Resize to 224x224
- RGB -> BGR channel swap: `img[..., ::-1]`
- Subtract means: `[93.5940, 104.7624, 129.1863]`
- NO pixel normalization (no /255)

### Label Convention
- Filesystem: Autistic=0 (alphabetical), Non_Autistic=1
- Training target: `1 - y` flip -> Autistic=1, Non_Autistic=0

### Model Files
| File | Path (relative to backEnd/) | Size | Git tracked? |
|------|---------------------------|------|-------------|
| VGG-Face CNN weights | mlModels/autisumDetect/sector1/Stage_4/models/fold_5_best.h5 | ~525 MB | NO (.gitignored) |
| LogReg probe | mlModels/autisumDetect/sector1/Stage_4/models/logreg_probe_model.pkl | 2.9 KB | Yes |
| LogReg scaler | mlModels/autisumDetect/sector1/Stage_4/models/logreg_probe_scaler.pkl | 6.7 KB | Yes |
| XGBoost Q-CHAT | mlModels/autisumDetect/sector2/Stage_2/models/xgboost_qchat_stage2.pkl | 288 KB | Yes |
| Feature columns | mlModels/autisumDetect/sector2/Stage_2/models/qchat_feature_columns.pkl | 101 B | Yes |

The `.h5` file must be manually placed. Source: `C:\Users\Yasindu\Desktop\Stuff\1.SLIIT\Research\Project\Best_Models\fold_5_best.h5`

### ASD Backend Router (asd_router.py, 491 lines)
Mounted at `/api/asd/` with 5 endpoints:
- `GET /api/asd/status` — health check
- `POST /api/asd/predict-face` — single image -> MTCNN -> VGG-Face -> 256-D -> scaler -> LogReg -> P(ASD)
- `POST /api/asd/predict-video` — video -> 1 frame/3s -> per-frame pipeline -> soft-avg P(ASD) + Supabase upload
- `POST /api/asd/predict-qchat` — 12 features -> XGBoost -> P(ASD) + Q-CHAT score
- `POST /api/asd/predict-fused` — alpha=0.15 x facial + 0.85 x qchat -> risk level + Supabase save

Constants: `ALPHA=0.15`, `FACIAL_THRESHOLD=0.06`, `QCHAT_THRESHOLD=0.35`, `FUSION_THRESHOLD=0.35`

### ASD Frontend Screens
All in `frontEnd/app/(tabs)/`:
- `asd-screen.tsx` — entry point (two paths: AI-Powered vs Q-CHAT)
- `asd-qchat.tsx` — 10 behavioral + 2 demographic questions
- `asd-qchat-result.tsx` — Q-CHAT-only result display
- `asd-research.tsx` — video + questionnaire combined flow
- `asd-result.tsx` — fused result with risk banner

### Known Issues / Areas for Improvement
1. Video sampling too sparse (1 frame/3s = ~3 frames for 10s video)
2. No frame-quality filter (no sharpness/pose/face-size gating)
3. Falls back to raw frame if MTCNN fails (should skip instead)
4. Averages probabilities instead of embeddings (less clean mathematically)
5. API base hardcoded to `localhost:8000` in ASD screens
6. Supabase credentials are stubs in `lib/supabase.ts`
7. FACIAL_THRESHOLD=0.06 is extreme — nearly always predicts ASD standalone

### Key Research Findings (honest, for thesis)
- GradCAM shows dataset confound (age/photo-style, not ASD facial features)
- Calibration is poor (Brier=0.2111, ECE=0.0982, overconfident)
- Stage_4 regressed vs Stage_2 on every metric
- LogReg-beats-NN is the strongest methodological finding (linear probe on embeddings)
- Q-CHAT SHAP = scoring rule reconstruction, not novel signal
- Fusion AUC gain is marginal; complementarity (0.23% joint FN) is the real contribution

## Other ML Components (team members)

### Cry Translator
- Audio: GradientBoosting (pain vs no-pain, then hunger vs normal), 355 features
- Facial: Random Forest on MediaPipe landmarks (EAR, MAR, Brow)
- Fusion: XGBoost with isotonic calibration, 6 classes

### Growth Forecasting
- LSTM (21-feature window, hidden=64) + RF/XGBoost risk + WHO WAZ charts

### Postpartum Recovery
- 3 pain models: RF (perineal), RF (csection), Ridge (back/pelvic)
- SHAP explainability, MongoDB persistence

## Running the App

**Backend:**
```bash
cd backEnd
pip install -r requirements.txt
# Ensure fold_5_best.h5 is in mlModels/autisumDetect/sector1/Stage_4/models/
python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontEnd
npm install
npx expo start
```

**Environment:** Backend needs `.env` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optionally `MONGODB_URI`.

## Running the ASD Backend Locally (Yasindu's dev setup)

When only testing the ASD component (teammates' cry/growth/postpartum deps not available), use the `asdTf01` conda env — it has TF 2.20 which matches the project's model training version.

**Conda env:** `asdTf01`
**Python path:** `C:/Users/Yasindu/.conda/envs/asdTf01/python.exe` (Python 3.9, TF 2.20.0)

**Packages already in the env:** tensorflow 2.20, tf_keras, mtcnn, opencv-python, supabase, pandas, numpy.

**Packages pip-installed on top of the base env** (required for backend to run):
```bash
C:/Users/Yasindu/.conda/envs/asdTf01/Scripts/pip.exe install fastapi "uvicorn[standard]" pydantic python-dotenv joblib scikit-learn python-multipart xgboost supabase
```

**Start the backend (ASD-only):**
```bash
cd backEnd
C:/Users/Yasindu/.conda/envs/asdTf01/python.exe -m uvicorn app:app --host 0.0.0.0 --port 8000
```

**Note:** `backEnd/app.py` has local try/except wrappers around teammates' router imports (cry_router_audio, cry_router_img, cry_router_fusion, growth_router, postpartum, feedback_router) so the backend can boot with just the ASD router mounted. This is a **local-only** change — do not commit it. When all team members' deps are installed in one env, these wrappers can be removed.

**Verify the backend is up:**
```bash
curl http://localhost:8000/api/asd/status
# → {"status":"ok","models":{"vgg_face":true,"logreg_probe":true,"xgboost_qchat":true},...}
```

## Git Notes
- `.h5` files are gitignored (too large)
- `.pkl` files ARE tracked (all < 500 KB)
- `.gitattributes` has LFS rules for `.h5`, `.keras`, `.exe`, `.zip`, `.task`, `.joblib`
- Research repo with full training history: `C:\Users\Yasindu\Desktop\Stuff\1.SLIIT\Research\Project\infant-growth-monitoring-system\` (branch `asd-research`)
