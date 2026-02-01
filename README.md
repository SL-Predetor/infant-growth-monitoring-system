# Infant Growth Monitoring System

A comprehensive AI-powered system for monitoring infant well-being through cry analysis and facial pain detection.

## Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- FFmpeg (for audio processing)
- Git

### Backend Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd infant-growth-monitoring-system
```

2. **Set up Python virtual environment**
```bash
cd backEnd
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

3. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

4. **Download FFmpeg** (Windows)
   - Download from: https://ffmpeg.org/download.html
   - Extract `ffmpeg.exe` and place in the `backEnd` folder

5. **Verify models exist**
```
backEnd/
└── mlModels/
    └── Cry/
        ├── audio_cry_classifier.h5

mlModels/CryTranslater/
├── saved_models/
│   └── img_rf_pain_classifier3.pkl
└── Notebooks/
    └── face_landmarker.task (auto-downloads if missing)
```

### Frontend Setup

1. **Navigate to frontend**
```bash
cd frontEnd
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure API endpoint**
   - Edit `app/(tabs)/cry-translator.tsx`
   - Update `BASE_URL`:
   ```typescript
   const BASE_URL = "http://localhost:8000";  // For local testing
   // const BASE_URL = "http://YOUR_IP:8000"; // For mobile device
   ```

## Usage

### Starting the Backend

1. **Activate virtual environment**
```bash
cd backEnd
.venv\Scripts\activate  # Windows
```

2. **Run the FastAPI server**
```bash
python app.py
```

**Expected output:**
```
🔍 [AudioRouter] Audio Model loaded successfully
✅ [FaceRouter] Random Forest model loaded successfully
✅ [FaceRouter] MediaPipe Face Detector initialized
INFO: Uvicorn running on http://0.0.0.0:8000
```

### Starting the Frontend

1. **Start Expo development server**
```bash
cd frontEnd
npm start
```

2. **Choose your platform:**
   - Press `w` → Web browser
   - Press `a` → Android emulator
   - Press `i` → iOS simulator
   - Scan QR code → Physical device (Expo Go app)

### Using the Application

The app features a **6-tab navigation system** for easy access to all features:

#### Tab Navigation
1. **Home** - Main menu with quick access to all features
2. **Cry Translator** - Audio cry analysis and facial pain detection
3. **Behavior** - Child behavior and development tracking
4. **Growth** - Height and weight prediction forecaster
5. **Recovery** - Postpartum recovery guidance
6. **Profile** - User profile and settings

#### Cry Translator Tab
**Features:**
- Audio cry analysis (Hungry, Pain, Burping, etc.)
- Facial pain detection from photos
- Dual mode operation:
  
**Audio Cry Analysis:**
1. Open Cry Translator tab
2. Press Start to begin recording
3. Record infant cry (auto-stops after 5 seconds)
4. Optional: Press Play to review recording
5. Press Analyze to classify cry
6. View result with confidence percentage

**Facial Pain Detection:**
1. Stay in Cry Translator tab
2. Switch to face analysis mode
3. Choose input method:
   - **Camera**: Take new photo
   - **Gallery**: Select existing image
4. Ensure baby's face is clearly visible
5. Press Analyze to detect pain
6. View result with:
   - Pain/No Pain classification
   - Confidence score
   - Extracted biomarkers (EAR, MAR, Brow Score)

## API Documentation

### Base URL
```
http://localhost:8000
```

### Endpoints

#### Health Check
**GET** `/`

**Response:**
```json
{
  "status": "online",
  "message": "Backend is running correctly (Audio + Face)"
}
```

#### Audio Cry Analysis
**POST** `/predict-cry`

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (audio file, WAV/M4A/MP3)

**Response:**
```json
{
  "label": "Hungry",
  "confidence": 85.4,
  "message": "Baby might be hungry 🍼",
  "probabilities": {
    "Hungry": 85.4,
    "BellyPain": 8.2,
    "Burping": 3.1,
    "Discomfort": 2.5,
    "Tired": 0.8
  }
}
```

#### Facial Pain Detection
**POST** `/predict-face`

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image file, JPG/PNG)

**Response:**
```json
{
  "label": "pain_expression",
  "confidence": 92.3,
  "pain_probability": 92.3,
  "message": "Detected: Painful Expression 😣",
  "features": {
    "ear": 0.2345,
    "mar": 0.5678,
    "brow_score": 0.1234
  }
}
```

**Feature Descriptions:**
- **EAR** (Eye Aspect Ratio): Lower values indicate eye squinting (pain indicator)
- **MAR** (Mouth Aspect Ratio): Higher values indicate mouth opening (crying)
- **Brow Score**: Lower values indicate brow lowering/furrowing (pain indicator)

## Model Training

### Audio Model (CNN)

**Location:** `backEnd/mlModels/Cry/audio_cry_classifier.h5`

**Architecture:**
- Input: MFCC features (40 coefficients × time steps)
- 3 Conv1D layers with BatchNormalization and Dropout
- GlobalAveragePooling1D
- Dense layers with L2 regularization
- Output: 5 classes (Softmax)

**Training Process:**
```bash
cd mlModels/CryTranslater/Notebooks
jupyter notebook "Audio pain recognition5.ipynb"
```

**Dataset:**
- 5 cry types: Hungry, Belly Pain, Burping, Discomfort, Tired
- Augmentation: Noise addition, pitch shifting, time stretching

### Face Model (Random Forest)

**Location:** `mlModels/CryTranslater/saved_models/img_rf_pain_classifier3.pkl`

**Features:**
- **EAR**: Eye Aspect Ratio (vertical/horizontal eye distance)
- **MAR**: Mouth Aspect Ratio (vertical/horizontal mouth distance)
- **Brow Score**: Normalized brow-to-eye distance

**Training Process:**

1. **Extract features from images:**
```bash
cd mlModels/CryTranslater/Notebooks
jupyter notebook "img data processing3.ipynb"
```

2. **Train Random Forest classifier:**
```bash
jupyter notebook "ImgPainRecognition3.ipynb"
```

**Dataset:**
- Pain: 6,368 images
- No Pain: 2,135 images
- Source: `mlModels/CryTranslater/data/raw/img/Combined dataset/`

**Performance:**
- Accuracy: ~88-92%
- Class weights: Balanced
- Features: Interpretable biomarkers

## Project Structure

```
infant-growth-monitoring-system/
├── backEnd/
│   ├── app.py                          # FastAPI main application
│   ├── requirements.txt                # Python dependencies
│   ├── ffmpeg.exe                      # Audio processing tool
│   ├── routers/
│   │   ├── cry_router_audio.py        # Audio analysis API
│   │   └── cry_router_img.py          # Face analysis API
│   └── mlModels/
│       └── Cry/
│           └── audio_cry_classifier.h5 # Audio CNN model
│
├── frontEnd/
│   ├── app/
│   │   ├── _layout.tsx                # Root layout with auth & theme
│   │   ├── modal.tsx                  # Modal component
│   │   └── (tabs)/
│   │       ├── _layout.tsx            # Tab navigation (6 tabs)
│   │       ├── index.tsx              # Home screen with menu grid
│   │       ├── cry-translator.tsx     # 🎤 Cry Translator (audio + face)
│   │       ├── behavior.tsx           # 👶 Behavior & Development
│   │       ├── growth.tsx             # 📊 Growth Forecaster
│   │       ├── recovery.tsx           # 💪 Mom's Recovery
│   │       └── Profile.tsx            # 👤 User Profile
│   ├── components/                     # Reusable UI components
│   ├── constants/                      # Theme and constants
│   ├── hooks/                          # Custom React hooks
│   ├── lib/                            # Utilities and helpers
│   ├── models/                         # Data models
│   ├── package.json
│   ├── tsconfig.json
│   └── app.json
│
├── mlModels/
│   └── CryTranslater/
│       ├── saved_models/
│       │   └── img_rf_pain_classifier3.pkl  # Face RF model
│       ├── Notebooks/
│       │   ├── img data processing3.ipynb   # Feature extraction
│       │   ├── ImgPainRecognition3.ipynb    # Model training
│       │   ├── Audio pain recognition5.ipynb
│       │   └── face_landmarker.task         # MediaPipe model
│       └── data/
│           ├── raw/                          # Original datasets
│           └── processed/                    # Extracted features
│
└── README.md
```

## Frontend Architecture

### Navigation Structure (Expo Router)

The frontend uses **Expo Router** with a professional **6-tab bottom navigation system**:

```
App Root (app/_layout.tsx)
  ├── Theme Provider
  ├── Auth Provider
  └── Tab Navigator (app/(tabs)/_layout.tsx)
      ├── Home Tab (index.tsx) - Menu grid
      ├── Cry Translator Tab (cry-translator.tsx) - Audio + Face analysis
      ├── Behavior Tab (behavior.tsx) - Development tracking
      ├── Growth Tab (growth.tsx) - Height/weight prediction
      ├── Recovery Tab (recovery.tsx) - Postpartum guidance
      └── Profile Tab (Profile.tsx) - User settings
```

### Tab Features

| Tab | Component | Features |
|-----|-----------|----------|
| **Home** | `index.tsx` | Quick menu to all features |
| **Cry Translator** | `cry-translator.tsx` | Audio cry analysis and facial pain detection |
| **Behavior** | `behavior.tsx` | Child behavior and development tracking |
| **Growth** | `growth.tsx` | Height and weight prediction forecaster |
| **Recovery** | `recovery.tsx` | Postpartum recovery guidance |
| **Profile** | `Profile.tsx` | User profile and app settings |

### Component Hierarchy

```
App (Root Layout)
│
├── SplashScreen (Loading)
├── AuthContext (Authentication)
├── ThemeProvider (Dark/Light mode)
│
└── TabNavigator
    ├── HomeScreen
    │   └── MenuGrid (Navigation to all features)
    │
    ├── CryTranslatorScreen
    │   ├── AudioRecorder (expo-av)
    │   ├── AudioPlayer (expo-av)
    │   ├── ImagePicker (expo-image-picker)
    │   └── API Integration
    │
    ├── BehaviorScreen
    │   └── ParallaxScrollView
    │
    ├── GrowthScreen
    │   └── ParallaxScrollView
    │
    ├── RecoveryScreen
    │   └── ParallaxScrollView
    │
    └── ProfileScreen
        └── User Settings
```

### Key Technologies

- **Expo Router** - File-based routing (like Next.js)
- **React Native** - Cross-platform UI
- **TypeScript** - Type safety
- **expo-av** - Audio recording/playback
- **expo-image-picker** - Camera/gallery access
- **Appwrite** - Backend authentication
- **Custom Hooks** - State management (useState, useContext)

## Technologies Used

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | Modern Python web framework |
| **TensorFlow/Keras** | Audio CNN model |
| **scikit-learn** | Random Forest classifier |
| **MediaPipe** | Facial landmark detection |
| **librosa** | Audio feature extraction (MFCC) |
| **OpenCV** | Image processing |
| **NumPy/Pandas** | Data manipulation |
| **joblib** | Model serialization |
| **FFmpeg** | Audio format conversion |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React Native** | Cross-platform mobile framework |
| **Expo** | Development toolchain |
| **TypeScript** | Type-safe JavaScript |
| **expo-av** | Audio recording/playback |
| **expo-image-picker** | Camera/gallery access |

### Machine Learning
| Technique | Application |
|-----------|-------------|
| **CNN** | Audio pattern recognition |
| **Random Forest** | Facial expression classification |
| **MFCC** | Audio feature extraction |
| **Facial Action Units** | Pain biomarkers |
| **Data Augmentation** | Dataset expansion |

## Troubleshooting

### Backend Issues

#### Model not loading
```bash
# Check if model files exist
python -c "import os; print('Audio:', os.path.exists('backEnd/mlModels/Cry/audio_cry_classifier.h5'))"
python -c "import os; print('Face:', os.path.exists('mlModels/CryTranslater/saved_models/img_rf_pain_classifier3.pkl'))"
```

**Solution:** Ensure models are trained and saved in correct locations.

#### FFmpeg not found
```
Error: FFmpeg not installed or not in PATH
```

**Solution:**
- Download FFmpeg: https://ffmpeg.org/download.html
- Extract `ffmpeg.exe` to `backEnd` folder
- Or add to system PATH

#### Port already in use
```
Error: [Errno 10048] Only one usage of each socket address
```

**Solution:**
```python
# Edit app.py
uvicorn.run(app, host="0.0.0.0", port=8001)  # Change port
```

#### MediaPipe import error
```
ImportError: No module named 'mediapipe'
```

**Solution:**
```bash
pip install mediapipe
```

### Frontend Issues

#### Cannot connect to backend
```
Network request failed / Connection timeout
```

**Solutions:**
1. Verify backend is running (`python app.py`)
2. Check IP address in `BASE_URL`
3. For local testing: Use `http://localhost:8000`
4. For mobile device: Use `http://YOUR_LOCAL_IP:8000`
5. Check firewall settings (allow port 8000)

**Find your IP:**
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

#### Camera permissions denied
**Solution:** Grant permissions in device settings → App → Permissions

#### Image not detecting face
**Solutions:**
- Ensure good lighting
- Face should be clearly visible
- Try different angles
- Check image quality

### Model Performance Issues

#### Low accuracy on audio
**Possible causes:**
- Background noise too loud
- Recording too short (<3 seconds)
- Baby cry not clear

**Solutions:**
- Record in quiet environment
- Hold device closer to baby
- Ensure 5-second recording completes

#### False positives on face detection
**Possible causes:**
- Poor image quality
- Occlusions (hands, blankets)
- Extreme angles

**Solutions:**
- Use frontal face images
- Ensure face is unobstructed
- Adequate lighting

## Performance Metrics

### Audio Model
- **Training Accuracy:** ~85-90%
- **Validation Accuracy:** ~80-85%
- **Classes:** 5 (Hungry, Belly Pain, Burping, Discomfort, Tired)
- **Input:** MFCC features (40 coefficients)

### Face Model
- **Training Accuracy:** ~92%
- **Test Accuracy:** ~88%
- **Precision:** Balanced via class weights
- **Dataset:** 8,503 images (Pain: 6,368 | No Pain: 2,135)
- **Features:** 3 biomarkers (EAR, MAR, Brow Score)

## Security Considerations

- **CORS:** Currently set to `allow_origins=["*"]` for development
- **Production:** Update CORS to specific domains
- **API Keys:** Consider adding authentication for production
- **Data Privacy:** No data is stored by default
- **HTTPS:** Use SSL/TLS for production deployment

## Deployment

### Backend Deployment (Example: Heroku)
```bash
# Add Procfile
echo "web: uvicorn app:app --host 0.0.0.0 --port $PORT" > Procfile

# Deploy
heroku create infant-monitoring-api
git push heroku main
```

### Frontend Deployment
```bash
# Build for production
expo build:android
expo build:ios
expo build:web
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Authors

- **Research Team** - *Initial development*

## 🙏 Acknowledgments

- MediaPipe team for facial landmark detection framework
- TensorFlow/Keras team for deep learning tools
- Expo team for mobile development platform
- Open-source infant cry dataset contributors
- Research community for pain assessment methodologies

## 📧 Contact & Support

For questions, issues, or contributions:
- Open an issue on GitHub
- Contact: [Your Email]

---

**⚠️ Important Notice:** This system is intended for research and educational purposes only. It should NOT replace professional medical advice, diagnosis, or treatment. Always consult qualified healthcare professionals for infant health concerns.

## 🎯 Future Enhancements

- [ ] Real-time video analysis
- [ ] Multi-infant monitoring
- [ ] Historical data tracking
- [ ] Parent mobile notifications
- [ ] Integration with wearable devices
- [ ] Cloud-based data storage
- [ ] Multi-language support
- [ ] Improved model accuracy with larger datasets
