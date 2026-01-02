# 🍼 Infant Growth Monitoring System

AI-powered system for infant cry analysis and facial pain detection.

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.8+
- Node.js 16+
- Git

### 1. Clone the Project
```bash
git clone <your-repo-url>
cd infant-growth-monitoring-system
```

### 2. Setup Backend

```bash
# Navigate to backend folder
cd backEnd

# Create virtual environment
python -m venv .venv

# Activate it (Windows)
.venv\Scripts\activate

# Activate it (Mac/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Note:** Download FFmpeg from https://ffmpeg.org/download.html and place `ffmpeg.exe` in the `backEnd` folder (Windows only).

### 3. Setup Frontend

```bash
# Navigate to frontend folder
cd frontEnd

# Install dependencies
npm install
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd backEnd
.venv\Scripts\activate  # Windows
python app.py
```

Wait for this message:
```
✅ [AudioRouter] Audio Model loaded successfully
✅ [FaceRouter] Face Model loaded successfully
INFO: Uvicorn running on http://0.0.0.0:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontEnd
npm start
```

Press `w` to open in web browser.

## 📱 Using the App

### Audio Analysis
1. Select **🎤 Audio** tab
2. Press **Start** → Record 5 seconds
3. Press **Analyze** → View cry type (Hungry, Pain, etc.)

### Face Analysis
1. Select **📸 Face** tab
2. Press **Camera** or **Gallery** → Select image
3. Press **Analyze** → View pain detection result

## 🔧 Troubleshooting

**Backend won't start?**
- Make sure virtual environment is activated
- Check if models exist in `backEnd/mlModels/` and `mlModels/CryTranslater/saved_models/`

**Frontend can't connect?**
- Verify backend is running on port 8000
- Check `BASE_URL` in `frontEnd/app/cry-translator-simple.tsx`
- For mobile: Change to `http://YOUR_LOCAL_IP:8000`

**Find your IP (Windows):**
```bash
ipconfig
```

---

**⚠️ Note:** This is a research project. Not for medical use.
