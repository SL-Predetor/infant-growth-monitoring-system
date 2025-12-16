# 🚀 Simple Baby Cry Translator - Setup Guide

## Overview
Simple FastAPI backend + React Native app for baby cry classification.

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Backend Dependencies
```bash
cd backEnd
pip install -r requirements.txt
```

### Step 2: Start Backend Server
```bash
cd backEnd
python app.py
```

**Expected output:**
```
✅ Model loaded successfully!
🚀 Starting Baby Cry Translator API...
📡 Server will run at: http://localhost:8000
📖 API docs at: http://localhost:8000/docs
```

### Step 3: Start Mobile App (New Terminal)
```bash
cd frontEnd
npx expo start
```

Press `w` for web or `a` for Android.

### Step 4: Test the App
1. **Record Audio**: Tap "🎤 Start Recording"
2. **Stop Recording**: Tap "⏹️ Stop Recording"
3. **Analyze**: Tap "🔍 Analyze Cry"
4. **View Result**: See cry type (Hunger/Pain/Normal) with confidence

---

## 📱 Mobile App Usage

### Recording Audio
- Tap "Start Recording" button
- Make cry sound or play baby cry audio
- Tap "Stop Recording" button
- ✅ confirmation will appear

### Getting Prediction
- After recording, tap "Analyze Cry" button
- Wait for AI processing (1-2 seconds)
- View result with emoji and confidence

### Clear & Retry
- Tap "🗑️ Clear" to reset
- Record new audio and analyze again

---

## 🔧 API Details

### Endpoint: POST /predict

**Request:**
```
multipart/form-data
- file: Audio file (WAV format)
```

**Response (Success):**
```json
{
  "label": "pain_cry",
  "confidence": 0.87,
  "prediction_id": 1,
  "message": "Detected: Pain Cry"
}
```

**Response (Error):**
```json
{
  "detail": "Model not loaded"
}
```

---

## 🎯 Cry Types

| Prediction | Label | Emoji | Meaning |
|------------|-------|-------|---------|
| 0 | hunger_cry | 🍼 | Baby is hungry |
| 1 | pain_cry | 😢 | Baby is in pain/discomfort |
| 2 | normal_cry | 🙂 | Normal fussy cry |

---

## 📊 Model Information

- **Type**: Scikit-learn Classifier
- **Input**: Audio WAV file
- **Features**: 13 audio features (amplitude, energy, etc.)
- **Output**: Cry type + confidence score
- **Model File**: `mlModels/CryTranslater/audio_pain_model1.pkl`

---

## 🌐 Network Configuration

### Testing on Physical Phone

1. **Find your PC IP address:**

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.100)

**Mac/Linux:**
```bash
ifconfig
```

2. **Update API URL in mobile app:**

Edit `frontEnd/app/cry-translator-simple.tsx`:
```tsx
const API_URL = "http://YOUR_PC_IP:8000/predict";
// Example: http://192.168.1.100:8000/predict
```

3. **Ensure same WiFi:**
- PC and phone must be on same network
- Firewall must allow port 8000

---

## ⚠️ Troubleshooting

### "Model not loaded"
**Problem**: Model file not found or corrupted

**Solution**:
```bash
# Verify model exists
dir mlModels\CryTranslater\audio_pain_model1.pkl  # Windows
ls mlModels/CryTranslater/audio_pain_model1.pkl   # Mac/Linux
```

### "Connection refused" (Mobile App)
**Problem**: Can't reach backend from phone

**Solution**:
1. Check backend is running (should see "Server will run at...")
2. Use PC IP instead of localhost
3. Ensure firewall allows port 8000
4. Confirm same WiFi network

### "Could not process audio file"
**Problem**: Audio format not supported

**Solution**:
- App records in WAV format by default
- If uploading file, ensure it's WAV format
- Check audio file is not corrupted

### Backend crashes on startup
**Problem**: Missing dependencies

**Solution**:
```bash
pip install --upgrade -r requirements.txt
```

---

## 📝 File Structure

```
backEnd/
├── app.py                    # FastAPI server (SIMPLE VERSION)
├── requirements.txt          # Python dependencies
└── tmp/                      # Temp audio files (auto-created)

frontEnd/
└── app/
    ├── cry-translator-simple.tsx   # Main cry translator screen
    └── (tabs)/
        └── index.tsx         # Home screen with navigation

mlModels/
└── CryTranslater/
    └── audio_pain_model1.pkl # Trained ML model
```

---

## 🎨 UI Features

| Component | Color | Purpose |
|-----------|-------|---------|
| Record Button | Red (#FF6B6B) | Start/Stop recording |
| Analyze Button | Teal (#4ECDC4) | Send audio for prediction |
| Result Box | Teal Border | Display prediction result |

---

## 🚀 API Documentation

FastAPI provides automatic interactive API docs:

1. Start backend: `python app.py`
2. Open browser: `http://localhost:8000/docs`
3. Test API endpoints directly in browser

---

## ✅ Success Checklist

- [ ] Backend installed: `pip install -r requirements.txt`
- [ ] Backend running: `python app.py` shows success messages
- [ ] Model loaded: See "✅ Model loaded successfully!"
- [ ] Frontend installed: `npm install` in frontEnd folder
- [ ] Frontend running: `npx expo start` works
- [ ] Can record audio in app
- [ ] Can analyze and get prediction
- [ ] Results display correctly

---

## 📞 Support

If issues persist:
1. Check backend terminal for error messages
2. Check mobile app console for errors
3. Verify all files exist in correct locations
4. Try restarting both backend and frontend

---

## 🎓 Next Steps

1. ✅ Test with real baby cry audio
2. ✅ Deploy backend to cloud (Heroku, AWS, etc.)
3. ✅ Collect feedback and improve model
4. ✅ Add more features (history, notifications, etc.)

---

**Ready to detect baby cries! 🎉**
