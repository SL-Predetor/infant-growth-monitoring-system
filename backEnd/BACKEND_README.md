# Backend API Structure - Modular Router Setup

## Architecture

```
backEnd/
├── app.py              # Main Flask app (imports and registers router)
├── routes/
│   └── cry_trancelater.py  # Router with all cry prediction logic
├── requirements.txt    # Python dependencies
└── tmp/               # Temporary audio/image storage (auto-created)
```

## API Endpoints

### POST `/predict-cry`
Predict cry type from audio file (and optional image)

**Request (multipart/form-data):**
```
- file: Audio file (required) - .wav, .mp3, etc
- image: Image file (optional) - .jpg, .png, etc
```

**Response:**
```json
{
  "label": "hunger_cry",
  "confidence": 0.92,
  "prediction": 0
}
```

**Labels:**
- `hunger_cry` (0) - Baby is hungry 🍼
- `pain_cry` (1) - Baby is in pain 😢
- `normal_cry` (2) - Baby is just fussing 🙂

### GET `/health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true
}
```

## File Structure

### app.py
- Initializes Flask app
- Enables CORS for frontend communication
- Registers the cry_trancelater router
- Runs on port 5000

### routes/cry_trancelater.py
- **`predict(audio_path, image_path=None)`** - Runs model prediction
- **`extract_features_simple(audio_path)`** - Extracts audio features using numpy + wave module
- **`@router.route('/predict-cry', POST)`** - Main prediction endpoint
- **`@router.route('/health', GET)`** - Health check

## Features Used for Prediction

The model is trained on MFCC features, but since we can't use librosa in the deployment environment, we use simple statistical features:

1. Mean amplitude
2. Standard deviation
3. Peak amplitude
4. Energy change

These are padded to 13 features to match the model's expected input size.

## How to Run

**Terminal 1 - Start Backend:**
```powershell
cd backEnd
python app.py
```

Expected output:
```
[OK] Model loaded in router
[START] Starting Cry Translator API server...
[INFO] Server running at http://localhost:5000
```

**Terminal 2 - Start Frontend:**
```powershell
cd frontEnd
npx expo start
```

## Testing the API

Using curl or Postman:
```bash
curl -X POST http://localhost:5000/predict-cry \
  -F "file=@path/to/baby_cry.wav"
```

Response:
```json
{
  "label": "hunger_cry",
  "confidence": 0.95,
  "prediction": 0
}
```

## Error Handling

- **Model not loaded**: Returns 500 error if model fails to load
- **No file provided**: Returns 400 error if audio file missing
- **Feature extraction failure**: Returns 500 error with error message
- **All exceptions caught**: Returns JSON error response

## Notes

- Temporary audio/image files are automatically cleaned up after prediction
- Model path: `mlModels/CryTranslater/audio_pain_model1.pkl`
- No external audio processing library needed (uses built-in `wave` module)
- CORS enabled for frontend access
- Debug mode enabled (suitable for development only)
