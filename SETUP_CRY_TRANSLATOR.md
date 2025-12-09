# Cry Translator Integration Guide

## Quick Setup

### 1. Install Backend Dependencies

```powershell
cd backEnd
pip install -r requirements.txt
```

**Required packages:**
- Flask (web server)
- Flask-CORS (cross-origin requests)
- scikit-learn (model prediction)
- numpy (numerical computing)

### 2. Start the Python Backend Server

```powershell
cd backEnd
python app.py
```

You should see:
```
[START] Starting Cry Translator API server...
[INFO] Server running at http://localhost:5000
```

### 3. Start the Frontend App (new terminal)

```powershell
cd frontEnd
npx expo start
```

Then press:
- `i` for iOS
- `a` for Android
- `w` for web

## How It Works

1. **Record**: Press "🔴 Start Recording" to begin recording baby's cry
2. **Stop**: Press "⏹ Stop & Analyze" to stop and send to backend
3. **Analyze**: Backend extracts audio features and runs model
4. **Result**: Shows cry type with confidence percentage

## Model Output

The model predicts one of three classes:
- **Hunger Cry** (0) → 🍼
- **Pain Cry** (1) → 😢
- **Normal/Comfort Cry** (2) → 🙂

## For Physical Device Testing

If testing on a **real phone**, update this line in `frontEnd/app/cry-translator.tsx`:

```tsx
// Change from:
const API_URL = "http://localhost:5000/predict-cry";

// To (replace XXX with your PC's IP):
const API_URL = "http://192.168.XXX.XXX:5000/predict-cry";
```

Find your PC's IP:
```powershell
ipconfig
```
Look for "IPv4 Address".

## Backend Architecture

**File**: `backEnd/app.py`

**Endpoints**:
- `POST /predict-cry` - Upload audio, get classification
- `GET /health` - Check if server and model are ready

**Audio Processing**:
- Uses Python's built-in `wave` module (no external dependencies)
- Extracts features: mean amplitude, std dev, peak amplitude, energy change
- Loads scikit-learn model from `mlModels/CryTranslater/audio_pain_model1.pkl`

**Model File**:
- Location: `mlModels/CryTranslater/audio_pain_model1.pkl`
- Type: Scikit-learn classifier (trained on cry audio samples)

## Troubleshooting

**Error: ModuleNotFoundError: No module named 'flask'**
```powershell
pip install flask flask-cors scikit-learn
```

**Error: "Connection refused" in app**
- Make sure backend server is running on port 5000
- Check firewall settings

**Error: "Model not loaded"**
- Verify `audio_pain_model1.pkl` exists in `mlModels/CryTranslater/`
- Check file permissions

**No audio recorded on device**
- Check microphone permissions in device settings
- Try recording a test audio file first

