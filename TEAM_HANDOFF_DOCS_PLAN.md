# Plan — Teammate handoff docs & env templates

> **Purpose.** Teammates need to clone the repo and get the backend + frontend running on their own machines with minimal friction. Today the setup relies on tribal knowledge living in CLAUDE.md §6–§8. This prompt creates three small, copy-pasteable artifacts that turn "read CLAUDE.md and figure it out" into "follow 8 commands."
>
> **Files created (all new, no edits to existing source):**
> 1. `.env.example` in the repo root — backend env template
> 2. `frontEnd/.env.example` — frontend env template
> 3. `TEAM_ONBOARDING.md` in the repo root — 1-page setup guide
>
> **Depends on:** Nothing. Safe to run in parallel with any other prompt. Does not modify running code.

## Agent task list (execute in order)

1. Create [.env.example](.env.example) in the **repo root** with the content in §Task 1.
2. Create [frontEnd/.env.example](frontEnd/.env.example) with the content in §Task 2.
3. Create [TEAM_ONBOARDING.md](TEAM_ONBOARDING.md) in the **repo root** with the content in §Task 3.
4. Verify `.gitignore` already excludes `.env` files (it does — confirm with `git check-ignore -v .env frontEnd/.env`) and that `.env.example` is **not** gitignored (it must be committed).
5. Do NOT stage or commit anything. Do NOT touch `.gitignore`. Do NOT modify CLAUDE.md, README.md, or any existing file.

---

## Context (read before touching files)

- Backend env vars are authoritative in [CLAUDE.md §6.1](CLAUDE.md). The runtime readers are:
  - `SUPABASE_URL` — growth_router, middleware/auth, database
  - `SUPABASE_ANON_KEY` — middleware/auth (JWT verification)
  - `SUPABASE_SERVICE_ROLE_KEY` — growth_router, database
  - `POSTPARTUM_MONGODB_URI` — postpartum/db (preferred)
  - `POSTPARTUM_DB_NAME` — postpartum/db (default `TinySteps_db`)
  - `POSTPARTUM_COLLECTION_NAME` — postpartum/db (default `postpartum`)
  - `MONGODB_URI` — postpartum/db (legacy fallback if `POSTPARTUM_MONGODB_URI` missing)
- Frontend env vars per [CLAUDE.md §6.2](CLAUDE.md). The runtime readers are:
  - `REACT_APP_API_BASE_URL` — services/analysisService
  - `EXPO_PUBLIC_API_BASE_URL` — smart-cry-analysis + other screens
  - `EXPO_PUBLIC_SUPABASE_URL` — lib/supabase
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — lib/supabase
  - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — Google OAuth (planned, stub today)
- **Never put real secrets in `.env.example`.** Use placeholder values that obviously need replacing. The example file IS committed; the real `.env` is not.
- The Docker large-model problem: `mlModels/autisumDetect/sector1/Stage_4/models/fold_5_best.h5` (~525 MB) is gitignored. It must be shared out-of-band and dropped at that exact path before `docker-compose up` — or the ASD face endpoint will be disabled (backend still boots).

---

## Task 1 — Create `.env.example` (repo root)

Create a new file at repo root. Exact content:

```env
# ─── Backend / Docker env template ───────────────────────────────────────────
# Copy this file to `.env` and fill in real values. Never commit `.env`.
# Full reference: CLAUDE.md §6.1

# ── Supabase ─────────────────────────────────────────────────────────────────
# From: Supabase dashboard → Project settings → API
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# ── MongoDB (postpartum + feedback) ──────────────────────────────────────────
# Preferred key; falls back to MONGODB_URI if absent.
POSTPARTUM_MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
POSTPARTUM_DB_NAME=TinySteps_db
POSTPARTUM_COLLECTION_NAME=postpartum

# Legacy alias — leave blank if POSTPARTUM_MONGODB_URI is set.
MONGODB_URI=
```

Notes for the executor:
- Keep the exact key names (readers are case-sensitive and string-literal).
- Do not add blank lines inside the Supabase block — teammates copy the whole file and edit in place, trailing whitespace is fine but inline reformatting can mask missing values.
- Do not add real credentials even temporarily for testing.

---

## Task 2 — Create `frontEnd/.env.example`

Create a new file at `frontEnd/.env.example`. Exact content:

```env
# ─── Frontend (Expo) env template ────────────────────────────────────────────
# Copy this file to `frontEnd/.env` and fill in real values. Never commit `.env`.
# Full reference: CLAUDE.md §6.2
#
# Expo convention: variables prefixed with EXPO_PUBLIC_ are bundled into the
# client and therefore NOT SECRET. Never put service-role keys here.

# ── API base URLs ────────────────────────────────────────────────────────────
# Local backend via Docker:                      http://localhost:8000
# Backend reachable from a physical phone on LAN: http://<your-laptop-LAN-ip>:8000
#
# Note: keep both variables in sync — analysisService reads REACT_APP_*, other
# screens read EXPO_PUBLIC_*. Unifying on one is on the cleanup list (CLAUDE.md §5.8).
REACT_APP_API_BASE_URL=http://localhost:8000
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000

# ── Supabase (client-side) ───────────────────────────────────────────────────
# Same Supabase project as the backend. Anon key only — never the service role.
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# ── Google OAuth (planned; leave blank until enabled) ────────────────────────
# Setup guide lives in CLAUDE.md §9.
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

---

## Task 3 — Create `TEAM_ONBOARDING.md` (repo root)

Create a new file at `TEAM_ONBOARDING.md`. Exact content:

````markdown
# Team Onboarding — TinySteps

> Everything a teammate needs to clone the repo and start fine-tuning their own ML module. For deeper architecture context, read [CLAUDE.md](CLAUDE.md).

## 1. Prerequisites

- **Docker Desktop** (Windows/Mac) or **Docker Engine + Compose** (Linux)
- **Node.js** ≥ 18 and **npm**
- **Git** with a GitHub account invited to this repo
- Optional: **Expo Go** on your phone (iOS/Android) if you want to test on a physical device

## 2. What you'll receive privately (not in the repo)

| Thing | Where to put it | Why it's not in git |
|---|---|---|
| Root `.env` contents | Paste into `.env` at repo root (copy from `.env.example` first) | Contains Supabase service-role key + Mongo URI |
| `frontEnd/.env` contents | Paste into `frontEnd/.env` (copy from `frontEnd/.env.example` first) | Contains Supabase anon key |
| `fold_5_best.h5` (ASD model, ~525 MB) | `mlModels/autisumDetect/sector1/Stage_4/models/fold_5_best.h5` | Too large for git; gitignored |

Only Yasindu (ASD module owner) strictly needs the `.h5` file. The backend boots without it and auto-disables the ASD face endpoint — everyone else can ignore the "model not found" warning at startup.

## 3. One-time setup

```bash
# Clone and hop onto your feature branch
git clone <repo-url>
cd infant-growth-monitoring-system
git checkout main && git pull
git checkout -b feat/<yourname>-<module>   # e.g. feat/kavi-cry-tuning

# Drop the files you received privately
cp .env.example .env                       # then paste real values into .env
cp frontEnd/.env.example frontEnd/.env     # then paste real values into frontEnd/.env
# ASD teammate only: copy fold_5_best.h5 into the path above

# Start the backend (Docker handles all Python/TF/XGBoost deps)
docker-compose up --build -d
docker-compose logs -f backend            # wait for "Application startup complete"

# Smoke test
curl http://localhost:8000/api/asd/status

# Start the frontend (new terminal)
cd frontEnd
npm install
npx expo start
```

Backend: <http://localhost:8000> · API docs: <http://localhost:8000/docs> · Frontend: Expo will print a QR code.

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
- **Physical phone can't reach the backend.** The phone doesn't resolve `localhost` on your laptop. Set both variables in `frontEnd/.env` to `http://<your-laptop-LAN-ip>:8000`, restart Metro, reconnect. Laptop and phone must be on the same Wi-Fi.
- **"ASD model not found" warning at startup.** Expected if you don't have `fold_5_best.h5`. Only relevant if you're working on the ASD module.
- **Mongo / Supabase connection errors on startup.** The affected endpoints degrade gracefully but the logs will be noisy. Ignore unless you're working on that module — or check your `.env` values.
- **RLS blocks your test inserts.** Supabase tables have Row-Level Security; you can't insert rows directly via the dashboard as an anonymous client. Sign up a real user through the app, then use that user's session for testing.
- **"Not signed in" on add-infant after signup.** Fixed — if you still see this, your branch is behind `main`. Pull the auth-integration changes.
- **Docker build is slow on first run.** First build downloads ~3 GB of Python deps (TF, OpenCV, XGBoost, torch). Subsequent builds use the cache and finish in seconds.

## 7. Getting help

- Architecture, endpoints, model inventory: [CLAUDE.md](CLAUDE.md)
- Supabase schema: [SUPABASE_SCHEMA_FIX.sql](SUPABASE_SCHEMA_FIX.sql)
- Auth flow plans: [CHECK_EMAIL_FLOW_PLAN.md](CHECK_EMAIL_FLOW_PLAN.md), [LAYOUT_FIRST_TIME_INFANT_PLAN.md](LAYOUT_FIRST_TIME_INFANT_PLAN.md)
- Stuck? Ping Yasindu on the team chat with (a) what you did, (b) what you expected, (c) what actually happened. Include logs.

## 8. Before your first commit

- [ ] You can hit `http://localhost:8000/docs` and see the FastAPI swagger page
- [ ] You can sign up a new account in the Expo app and land on the Home tab
- [ ] Your changes live on a `feat/<name>-<thing>` branch, not `main`
- [ ] You did NOT stage `.env`, `frontEnd/.env`, or `fold_5_best.h5` (all gitignored — `git status` should not list them)
- [ ] Your commit message follows the pattern `<type>: <short description>` (e.g. `feat: improve cry fusion calibration`)
````

---

## Acceptance

- [ ] `.env.example` exists at repo root with the keys from Task 1. No real secrets.
- [ ] `frontEnd/.env.example` exists with the keys from Task 2. No real secrets.
- [ ] `TEAM_ONBOARDING.md` exists at repo root with the content from Task 3.
- [ ] `git check-ignore -v .env frontEnd/.env` prints two lines showing both are ignored by a rule in `.gitignore`.
- [ ] `git check-ignore -v .env.example frontEnd/.env.example TEAM_ONBOARDING.md` prints nothing — all three are tracked (or will be once staged).
- [ ] Running `git status` lists the three new files as untracked. Do NOT stage them.
- [ ] No existing file (CLAUDE.md, README.md, package.json, any source file) is modified.

## Out of scope

- Editing `.gitignore`.
- Editing CLAUDE.md or README.md to link to the new files (you can do this in a follow-up; for now the onboarding doc stands alone).
- Creating a Makefile or shell script for the setup commands.
- Writing teammate-specific docs (cry / growth / postpartum module guides).
- Setting up CI/CD, GitHub Actions, or branch protection rules.
- Splitting the private secrets into a 1Password vault — out-of-band sharing is the user's call.

## Notes for the executor

- Use the `Write` tool to create the three files verbatim. Do not pretty-print, do not "improve" the copy. The markdown inside the triple-backtick block in Task 3 includes nested fenced code blocks — make sure you preserve them (the outer fence uses four backticks `````` specifically so nested triple-backticks render).
- Windows line endings are fine if your editor adds them — `.gitattributes` handles normalization on commit.
- The `.env.example` files must end with a single trailing newline (most editors do this by default).
- When you're done, report a one-line summary per file + the output of `git status --short` showing all three as untracked `??`.
