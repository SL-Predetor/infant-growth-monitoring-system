# Team Onboarding — TinySteps

> Everything a teammate needs to clone the repo and start fine-tuning their own ML module. For deeper architecture context, read [CLAUDE.md](CLAUDE.md).

## 1. Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine + Compose** (Linux)
- **Node.js** ≥ 18 and **npm**
- **Git** with a GitHub account invited to this repo, and **Git LFS** installed (`git lfs install` once per machine)
- Optional: **Expo Go** on your phone (iOS/Android) if you want to test on a physical device

## 2. What you'll receive privately (not in the repo)

| Thing | Where to put it | Why it's not in git |
|---|---|---|
| Root `.env` contents | Paste into `.env` at repo root (copy from `.env.example` first) | Contains Supabase service-role key + Mongo URI |
| `frontEnd/.env` contents | Paste into `frontEnd/.env` (copy from `frontEnd/.env.example` first) | Contains Supabase anon key |
| `fold_5_best.h5` (ASD model, ~525 MB) | `mlModels/autisumDetect/sector1/Stage_4/models/fold_5_best.h5` | Too large for free GitHub LFS quota; shared via Drive |

Only Yasindu (ASD module owner) strictly needs the `.h5` file. The backend boots without it and auto-disables the ASD face endpoint — everyone else can ignore the "model not found" warning at startup.

## 3. One-time setup

### Step 1 — Clone and configure (same for both options)

```bash
# Clone (LFS files — ffmpeg.exe, .task, .joblib — are pulled automatically)
git clone <repo-url>
cd infant-growth-monitoring-system
git checkout main && git pull
git checkout -b feat/<yourname>-<module>   # e.g. feat/kavi-cry-tuning

# Drop the files you received privately
cp .env.example .env                       # then paste real values into .env
cp frontEnd/.env.example frontEnd/.env     # then paste real values into frontEnd/.env
# ASD teammate only: copy fold_5_best.h5 into
# mlModels/autisumDetect/sector1/Stage_4/models/fold_5_best.h5
```

### Step 2 — Pick a backend runtime

You need **one** of the two. Docker is the shortest path. Conda is faster for Python-side iteration but has more setup friction.

---

#### Option A — Docker (recommended)

Everything comes pre-baked: Python 3.11, TF 2.20, OpenCV, XGBoost, torch, ffmpeg. No system deps to install.

```bash
docker-compose up --build -d
docker-compose logs -f backend              # wait for "Application startup complete"

# Smoke test
curl http://localhost:8000/api/asd/status
```

First build downloads ~3 GB of Python deps and takes 5–10 minutes. Subsequent builds use BuildKit cache and finish in seconds.

---

#### Option B — Conda env (Python-native, no container)

Use this if you want faster Python reload / notebook work, or if Docker Desktop is a pain on your machine.

**System prerequisites** (one-time):
- **Linux (Debian/Ubuntu):** `sudo apt install ffmpeg libgl1 libglib2.0-0`
- **macOS:** `brew install ffmpeg`
- **Windows:** `ffmpeg` is already bundled at `backEnd/ffmpeg.exe` — nothing to install.

**Create the env and install deps:**

```bash
# From repo root
conda create -n tinysteps python=3.11 -y
conda activate tinysteps
pip install -r backEnd/requirements.txt
```

First install downloads ~3 GB. On Windows with limited pip timeouts, use:
`pip install --timeout 600 --retries 10 -r backEnd/requirements.txt`

**Run the backend:**

```bash
cd backEnd
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

The `--reload` flag gives you hot-reload on Python file save — a big DX win vs. Docker for iterative work.

Smoke test from another terminal: `curl http://localhost:8000/api/asd/status`

---

### Step 3 — Start the frontend (same for both options)

```bash
# New terminal
cd frontEnd
npm install
npx expo start
```

Backend: http://localhost:8000 · API docs: http://localhost:8000/docs · Frontend: Expo will print a QR code.

## 4. Daily workflow

```bash
# Start of day — sync main and branch off
git checkout main && git pull
git checkout -b feat/<name>-<thing>

# ... edit files ...

# After Python / backend changes, restart the container
docker-compose restart backend

# Frontend hot-reloads automatically; restart Metro if env vars change.

# End of day — push and open a PR
git push -u origin feat/<name>-<thing>
# Open PR against main on GitHub; tag Yasindu for review
```

**Keep branches small and single-purpose.** One branch per unit of work (one model tweak, one screen change) — easier to review, easier to revert.

## 5. Module ownership

To keep merges conflict-free, each module has a primary owner. Anyone can read and suggest changes, but the owner merges:

| Owner | Backend | Frontend | Models |
|---|---|---|---|
| Yasindu (ASD) | `backEnd/routers/asd_router.py` | `frontEnd/app/(tabs)/asd-*.tsx`, `asd-qchat*.tsx`, `asd-research.tsx`, `asd-result.tsx` | `mlModels/autisumDetect/**` |
| Cry | `backEnd/routers/cry_router_*.py` | `frontEnd/app/(tabs)/smart-cry-analysis.tsx` | `mlModels/Cry/**`, `mlModels/CryTranslater/**` |
| Growth | `backEnd/routers/growth_router.py` | `frontEnd/app/(tabs)/growth*.tsx`, `update-measurements.tsx` | `mlModels/Growth/**` |
| Postpartum | `backEnd/postpartum/**` | `frontEnd/app/(tabs)/wellness.tsx`, `recovery.tsx`, `postpartum-*.tsx`, `mom-prediction-result.tsx` | `backEnd/postpartum/models/**` |

**Shared surfaces — always open a PR and ping a second reviewer:**
- `backEnd/app.py` (router mounting)
- `frontEnd/app/_layout.tsx` and `frontEnd/app/(tabs)/_layout.tsx` (routing / tabs)
- `frontEnd/lib/auth-context.tsx`, `frontEnd/lib/supabase.ts`
- `frontEnd/constants/theme.ts` (design tokens)
- `CLAUDE.md`, this file, `docker-compose.yml`, `SUPABASE_SCHEMA_FIX.sql`

## 6. Common gotchas

- **Port 8000 already in use.** `docker-compose down` first, or kill the old uvicorn. On Windows: `netstat -ano | findstr :8000` then `taskkill /PID <pid> /F`.
- **Physical phone can't reach the backend.** The phone doesn't resolve `localhost` on your laptop. Set both URL variables in `frontEnd/.env` to `http://<your-laptop-LAN-ip>:8000`, restart Metro, reconnect. Laptop and phone must be on the same Wi-Fi.
- **"ASD model not found" warning at startup.** Expected if you don't have `fold_5_best.h5`. Only relevant if you're working on the ASD module.
- **Mongo / Supabase connection errors on startup.** The affected endpoints degrade gracefully but the logs will be noisy. Ignore unless you're working on that module — or check your `.env` values.
- **RLS blocks your test inserts.** Supabase tables have Row-Level Security; you can't insert rows directly via the dashboard as an anonymous client. Sign up a real user through the app, then use that user's session for testing.
- **First build is slow.** First Docker build downloads ~3 GB of Python deps (TF, OpenCV, XGBoost, torch). Subsequent builds use the BuildKit cache and finish in seconds.
- **Git LFS not installed** → after clone, `backEnd/ffmpeg.exe` (and other LFS files) will be tiny pointer files, not the real binaries. Run `git lfs install` then `git lfs pull` to fix.

## 7. Getting help

- Architecture, endpoints, model inventory: [CLAUDE.md](CLAUDE.md)
- Supabase schema: [SUPABASE_SCHEMA_FIX.sql](SUPABASE_SCHEMA_FIX.sql)
- Auth flow plans: [CHECK_EMAIL_FLOW_PLAN.md](CHECK_EMAIL_FLOW_PLAN.md), [LAYOUT_FIRST_TIME_INFANT_PLAN.md](LAYOUT_FIRST_TIME_INFANT_PLAN.md)
- Stuck? Ping Yasindu on the team chat with (a) what you did, (b) what you expected, (c) what actually happened. Include logs.

## 8. Before your first commit

- [ ] You can hit http://localhost:8000/docs and see the FastAPI swagger page
- [ ] You can sign up a new account in the Expo app and land on the Home tab
- [ ] Your changes live on a `feat/<name>-<thing>` branch, not `main`
- [ ] You did NOT stage `.env`, `frontEnd/.env`, or `fold_5_best.h5` (all gitignored — `git status` should not list them)
- [ ] Your commit message follows the pattern `<type>: <short description>` (e.g. `feat: improve cry fusion calibration`)
