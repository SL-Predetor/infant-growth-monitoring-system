# TinySteps — Local Development Setup (Without Docker)

## Overview

This guide documents how to run the **TinySteps Infant Growth Monitoring System** locally on Windows without Docker. All fixes applied and configurations needed are documented here.

---

## What Was Done

### 1. **Backend Port Migration (8000 → 9000)**
- Changed backend from port 8000 to **port 9000** for consistency
- Updated all hardcoded URLs in frontend files
- Reason: Port 8000 was conflicting with other services; 9000 is standard for development

### 2. **Dynamic API URL Configuration**
- Created `frontEnd/lib/api-config.ts` for environment-aware URL resolution
- Supports 3 environments:
  - **Development** (localhost:9000)
  - **Staging** (staging API)
  - **Production** (production API)
- Auto-converts `localhost:8000` → `127.0.0.1:9000` as safety fallback
- Works across web, native, and Docker deployments

### 3. **MongoDB Atlas Integration**
- Connected to MongoDB Atlas cloud database
- Enables feedback persistence for cry analysis results
- No local MongoDB installation required

### 4. **Updated 9 Frontend Files**
All now use `getApiBaseUrl()` from `lib/api-config.ts`:
- `app/(tabs)/smart-cry-analysis.tsx`
- `app/(tabs)/cry-translator.tsx`
- `app/cry-translator-simple.tsx`
- `app/(tabs)/asd-qchat.tsx`
- `app/(tabs)/asd-research.tsx`
- `app/(tabs)/growth.tsx`
- `app/(tabs)/growth-history.tsx`
- `app/(tabs)/growth-insights.tsx`
- `app/(tabs)/index.tsx`

---

## Prerequisites

### Required
- **Python 3.11+** (backend)
- **Node.js 18+** (frontend)
- **npm** or **yarn**
- **Windows** (tested on Windows 10+)

### Optional
- MongoDB (local) — Not needed; using MongoDB Atlas
- Docker — Not needed for local dev

---

## Quick Start

### 1. Clone & Install Dependencies

```bash
# Backend dependencies
cd backEnd
pip install -r requirements.txt

# Frontend dependencies
cd ../frontEnd
npm install
```

### 2. Configure Environment Variables

#### Root `.env` (backend)
```bash
# File: .env (in project root)

# --- Supabase ---
SUPABASE_URL=https://wjpohxrirphhtvwgsaiy.supabase.co
SUPABASE_ANON_KEY=sb_publishable_optSoREEZzMLjo5XyezzRw_uzV8VG7V
SUPABASE_SERVICE_ROLE_KEY=sb_secret_q-K4d5MZ8-MJtcQo6PvXfg_kBXPoO0t

# --- MongoDB (already configured with Atlas) ---
POSTPARTUM_MONGODB_URI=mongodb+srv://dewmihennayake_db_user:Henna%23010810@cluster0.7giixre.mongodb.net/TinySteps_db?retryWrites=true&w=majority
POSTPARTUM_DB_NAME=TinySteps_db
POSTPARTUM_COLLECTION_NAME=postpartum
MONGODB_URI=mongodb+srv://dewmihennayake_db_user:Henna%23010810@cluster0.7giixre.mongodb.net/TinySteps_db?retryWrites=true&w=majority
```

#### Frontend `.env`
```bash
# File: frontEnd/.env

NODE_ENV=development
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:9000

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://wjpohxrirphhtvwgsaiy.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_optSoREEZzMLjo5XyezzRw_uzV8VG7V

# Google OAuth (optional, not yet implemented)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
```

### 3. Start Backend (Port 9000)

```bash
cd backEnd
python -m uvicorn app:app --host 0.0.0.0 --port 9000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:9000
INFO:     POSTPARTUM MODULE CONFIGURATION
[OK] POSTPARTUM_MONGODB_URI: SET
```

Test: `curl http://localhost:9000/docs` — Should see Swagger UI

### 4. Start Frontend (Dev Server)

```bash
cd frontEnd
npx expo start --clear
```

Choose platform:
- Press **`w`** for web (localhost:8084)
- Press **`a`** for Android emulator
- Press **`i`** for iOS simulator
- Press **`j`** for Android Studio

---

## How API URLs Work

### Development (Default)

```typescript
// Resolves to: http://127.0.0.1:9000
// Logic in: frontEnd/lib/api-config.ts

const BASE_URL = getApiBaseUrl();
```

**For Web:** Auto-detects hostname + port 9000
**For Native:** Falls back to 127.0.0.1:9000

### Physical Device

Edit `frontEnd/.env`:
```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.YOUR_IP:9000
```

Replace `192.168.1.YOUR_IP` with your machine's local IP (find via `ipconfig`).

### Docker/Production

Override in deployment `.env`:
```bash
NODE_ENV=production
REACT_APP_PROD_API_URL=https://api.tinysteps.app
```

---

## Testing the Setup

### 1. Cry Analysis (Smart Cry Screen)

1. Navigate to **Cry** tab
2. Click **"Tap to Record"** → record 3-5 seconds of audio
3. Click **"Next: Capture Face"** → capture image
4. Add context: age, feed time, sleep time, diaper status, room temp
5. Click **"Analyze"**

**Expected:** Results show predicted cry reason (Hunger/Pain/etc.) + confidence score

### 2. ASD Screening (ASD Tab)

1. Navigate to **ASD** tab
2. Choose **Face** or **Q-CHAT-10** mode
3. For face: upload baby photo
4. For Q-CHAT: answer 10 questions
5. Click **"Predict"**

**Expected:** ASD risk prediction with confidence

### 3. Growth Tracking (Home Tab)

1. Log measurements (weight, height, head circumference)
2. View growth charts and WHO percentiles
3. Check anomaly alerts

---

## Troubleshooting

### ❌ "net::ERR_CONNECTION_REFUSED"

**Cause:** Backend not running on port 9000

**Fix:**
```bash
# Terminal 1: Start backend
cd backEnd
python -m uvicorn app:app --host 0.0.0.0 --port 9000

# Verify:
curl http://localhost:9000/api/asd/status
```

### ❌ "POST http://localhost:8000/predict-cry"

**Cause:** Old hardcoded URL still in use

**Fix:**
```bash
# Hard refresh browser
Ctrl+Shift+R

# Or restart Expo
# In Expo terminal, press: r
```

### ❌ "MongoDB unavailable: ConfigurationError"

**Cause:** MongoDB URI not set or Atlas cluster down

**Fix:**
```bash
# Check .env has MongoDB URI
cat .env | grep POSTPARTUM_MONGODB_URI

# Verify Atlas cluster is running:
# https://cloud.mongodb.com → Clusters → check Status
```

### ❌ "ModuleNotFoundError: tensorflow"

**Cause:** Python dependencies not installed

**Fix:**
```bash
cd backEnd
pip install -r requirements.txt --upgrade
```

### ❌ API calls hit port 8000 instead of 9000

**Cause:** Env var not updated or app didn't reload

**Fix:**
1. Check `frontEnd/.env` has port 9000
2. Clear Expo cache: `npx expo start --clear`
3. Hard refresh browser: `Ctrl+Shift+R`

---

## Project Structure

```
.
├── backEnd/
│   ├── app.py                    # FastAPI entry point (port 9000)
│   ├── requirements.txt          # Python dependencies
│   ├── routers/                  # API routes (ASD, Cry, Growth, etc.)
│   ├── postpartum/               # Mom recovery module (MongoDB)
│   └── middleware/               # Auth middleware (unused for now)
│
├── frontEnd/
│   ├── .env                      # Frontend config (port 9000)
│   ├── lib/api-config.ts         # ✨ Dynamic URL resolver
│   ├── app/(tabs)/               # 5-tab layout screens
│   └── services/                 # API clients
│
├── mlModels/                     # ML models (ASD, Cry, Growth, Postpartum)
├── supabase/                     # Database migrations
├── .env                          # Root backend config
└── LOCAL_SETUP.md                # This file
```

---

## Environment Files Checklist

### Root `.env` (Backend)
- [ ] `SUPABASE_URL` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `POSTPARTUM_MONGODB_URI` set (MongoDB Atlas)
- [ ] `MONGODB_URI` set (alias for fallback)

### `frontEnd/.env` (Frontend)
- [ ] `NODE_ENV=development`
- [ ] `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:9000`
- [ ] `EXPO_PUBLIC_SUPABASE_URL` set
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` set

---

## Common Tasks

### Switch to Physical Device

```bash
# Get your machine's local IP
ipconfig

# Update frontEnd/.env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:9000  # Your IP

# Restart frontend
Ctrl+C in Expo terminal
npx expo start
```

### Use Local MongoDB (Optional)

If you want to use local MongoDB instead of Atlas:

1. Install MongoDB: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/
2. Start MongoDB: `mongod`
3. Update `.env`:
   ```bash
   POSTPARTUM_MONGODB_URI=mongodb://localhost:27017
   ```

### Deploy to Production

1. Build frontend:
   ```bash
   cd frontEnd
   npm run build
   ```

2. Update `.env` for production:
   ```bash
   NODE_ENV=production
   REACT_APP_PROD_API_URL=https://api.yourdomain.com
   POSTPARTUM_MONGODB_URI=your_prod_mongodb_uri
   ```

3. Deploy backend (e.g., Heroku, AWS, DigitalOcean):
   ```bash
   git push heroku main
   ```

---

## Key Changes Summary

| Item | Before | After |
|------|--------|-------|
| Backend port | 8000 | **9000** |
| Frontend URLs | Hardcoded `localhost:8000` | Dynamic `getApiBaseUrl()` |
| API config | Scattered across files | Centralized in `lib/api-config.ts` |
| MongoDB | Local only | **MongoDB Atlas** (cloud) |
| Environments | 1 (dev only) | 3 (dev/staging/prod) |
| Files updated | N/A | 9 frontend files |

---

## Next Steps

1. **Run locally** — Follow Quick Start above
2. **Test cry analysis** — Record audio + capture face
3. **Check logs** — Both terminals should show successful API calls
4. **Iterate** — Edit code; Expo hot-reloads automatically

---

## Support

For issues:
1. Check **Troubleshooting** section above
2. Verify both `.env` files have correct values
3. Check backend logs for model loading errors
4. Check browser console for frontend errors (F12)
5. Restart both backend and frontend if needed

---

## References

- **CLAUDE.md** — Master project documentation
- **Backend API docs:** http://localhost:9000/docs (when running)
- **Expo docs:** https://docs.expo.dev/
- **FastAPI docs:** https://fastapi.tiangolo.com/
- **MongoDB Atlas:** https://www.mongodb.com/cloud/atlas

---

**Last Updated:** April 30, 2026
**Setup By:** GitHub Copilot
**Status:** ✅ Ready for local development
