# TinySteps — Infant Growth Monitoring System

A multi-modal infant care app built as a SLIIT final-year research project. Four ML modules (ASD screening, cry translation, growth forecasting, postpartum recovery) behind a FastAPI backend and a React Native / Expo frontend.

## Stack

- **Frontend:** React Native, Expo 54, TypeScript
- **Backend:** FastAPI (Python 3.11)
- **ML:** TensorFlow 2.20, XGBoost, scikit-learn, OpenCV, MediaPipe, PyTorch
- **Data:** Supabase (PostgreSQL + Auth + Storage), MongoDB
- **Infra:** Docker / Docker Compose (conda env also supported)

## The four ML modules

| Module | Approach |
|---|---|
| **ASD detection** | VGG-Face CNN + Logistic Regression probe (image) · XGBoost Q-CHAT-10 (questionnaire) · α = 0.15 late fusion |
| **Cry translator** | GradientBoosting audio pipeline · RandomForest face landmarks · calibrated XGBoost 6-class fusion |
| **Growth forecaster** | LSTM weight forecasting (21-feature window) · RF / XGBoost risk & anomaly · WHO WAZ percentiles |
| **Postpartum recovery** | RandomForest perineal + C-section models · Ridge regression back/pelvic · SHAP explanations |

## Repository layout

```
backEnd/          FastAPI app, routers, Dockerfile, postpartum models
frontEnd/         Expo app, (auth) + (tabs) route groups
mlModels/         ML artifacts: models, notebooks, research plots
supabase/         SQL migrations
docker-compose.yml
CLAUDE.md         Master reference: endpoints, env vars, schema, known issues
TEAM_ONBOARDING.md  Teammate setup (clone → run in under 10 minutes)
```

## Getting started

**New teammate?** Start at **[TEAM_ONBOARDING.md](TEAM_ONBOARDING.md)** — it covers the full clone → `.env` → Docker-or-conda → Expo path with the 525 MB ASD model downloaded separately from Drive.

**Quick version (Docker, for someone with the `.env` files already):**

```bash
git clone <repo-url>
cd infant-growth-monitoring-system
cp .env.example .env                   # paste the real values
cp frontEnd/.env.example frontEnd/.env # paste the real values

docker-compose up --build -d           # backend at http://localhost:8000
docker-compose up -d
cd frontEnd && npm install && npx expo start
```

API docs: `http://localhost:8000/docs`.

## Documentation

| Doc | Purpose |
|---|---|
| [TEAM_ONBOARDING.md](TEAM_ONBOARDING.md) | Teammate setup — Docker / conda, env vars, model file placement, daily workflow |
| [CLAUDE.md](CLAUDE.md) | Deep reference — every endpoint, model file, env var, and the prioritized fix list |
| [SUPABASE_SCHEMA_FIX.sql](SUPABASE_SCHEMA_FIX.sql) | Canonical Supabase schema (7 tables + RLS) |

## License

Research artifacts and production code for an SLIIT final-year research project. The ASD and cry-translation models contain novel evaluations against public datasets — see [CLAUDE.md](CLAUDE.md) §3.2 for the honest research findings.
