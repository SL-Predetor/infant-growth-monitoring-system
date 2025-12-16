from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import joblib
import numpy as np
import uuid
import librosa
import soundfile as sf 

# --- CRITICAL FIX FOR WINDOWS FFMPEG ---
# This tells Python: "Look for ffmpeg.exe in THIS folder first"
# This fixes the "PySoundFile failed" error if you manually pasted ffmpeg.exe here.
os.environ["PATH"] += os.pathsep + os.path.dirname(os.path.abspath(__file__))

# Initialize App
app = FastAPI(title="Baby Cry Translator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LOAD MODEL ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'audio_pain_model3.pkl') 

print(f"🔍 Looking for model at: {MODEL_PATH}")

try:
    model = joblib.load(MODEL_PATH)
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None

# Labels
LABELS = {
    0: 'hunger_cry',
    1: 'pain_cry',
    2: 'normal_cry'
}

# --- IMPROVED FEATURE EXTRACTOR ---
# --- UPDATE THIS FUNCTION IN APP.PY ---
def extract_audio_features(audio_path):
    try:
        # Load audio
        audio, sample_rate = librosa.load(audio_path, sr=None)
        
        # 1. Extract MFCCs (Try 42 to get 168 features: 42 * 4 stats = 168)
        # If this doesn't work, we MUST see your notebook code.
        mfccs = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=42)
        
        # 2. Calculate Statistics to get 168 features
        mean = np.mean(mfccs.T, axis=0)  # 42 numbers
        std = np.std(mfccs.T, axis=0)    # 42 numbers
        max_v = np.max(mfccs.T, axis=0)  # 42 numbers
        min_v = np.min(mfccs.T, axis=0)  # 42 numbers
        
        # Combine them: 42 + 42 + 42 + 42 = 168 features
        features = np.concatenate([mean, std, max_v, min_v])
        
        return features.reshape(1, -1)
        
    except Exception as e:
        print(f"❌ Feature Extraction Error: {e}")
        return None

@app.get("/")
def home():
    return {"status": "running", "model_loaded": model is not None}

@app.post("/predict-cry")
async def predict_cry(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Use a safe temporary filename
    extension = file.filename.split(".")[-1] if "." in file.filename else "wav"
    temp_filename = f"tmp/{uuid.uuid4()}.{extension}"
    os.makedirs("tmp", exist_ok=True)
    
    try:
        content = await file.read()
        with open(temp_filename, "wb") as buffer:
            buffer.write(content)
        
        features = extract_audio_features(temp_filename)
        
        if features is None:
            # We explicitly return a 400 error here
            raise HTTPException(status_code=400, detail="Audio format not supported. Server needs FFmpeg.")

        # Predict
        prediction_index = model.predict(features)[0]
        
        try:
            probs = model.predict_proba(features)[0]
            confidence = float(np.max(probs))
        except:
            confidence = 1.0 
        
        label = LABELS.get(prediction_index, "unknown")

        return {
            "label": label,
            "confidence": confidence,
            "message": f"Detected: {label.replace('_', ' ').title()}"
        }

    except HTTPException as he:
        # Re-raise HTTP exceptions (like the 400 above) directly
        raise he
    except Exception as e:
        # Only catch UNEXPECTED crashes here
        print(f"🔥 CRITICAL ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")
        
    finally:
        if os.path.exists(temp_filename):
            try: os.remove(temp_filename)
            except: pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)