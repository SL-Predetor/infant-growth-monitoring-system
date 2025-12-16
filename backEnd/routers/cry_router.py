from fastapi import APIRouter, File, UploadFile, HTTPException
import joblib
import numpy as np
import uuid
import librosa
import os

router = APIRouter()

# --- MODEL LOADING LOGIC ---
# Since this file is in 'routers/', we must go UP one level (..) to find the model in 'backEnd/'
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, '..', 'audio_pain_model3.pkl')

print(f"🔍 [CryRouter] Looking for model at: {MODEL_PATH}")

try:
    model = joblib.load(MODEL_PATH)
    print("✅ [CryRouter] Model loaded successfully!")
except Exception as e:
    print(f"❌ [CryRouter] Error loading model: {e}")
    model = None

# Labels
LABELS = {
    0: 'hunger_cry',
    1: 'pain_cry',
    2: 'normal_cry'
}

# --- FEATURE EXTRACTOR (168 Features) ---
def extract_audio_features(audio_path):
    try:
        audio, sample_rate = librosa.load(audio_path, sr=None)
        
        # 1. MFCCs (42)
        mfccs = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=42)
        
        # 2. Statistics (4 * 42 = 168 features)
        mean = np.mean(mfccs.T, axis=0)
        std = np.std(mfccs.T, axis=0)
        max_v = np.max(mfccs.T, axis=0)
        min_v = np.min(mfccs.T, axis=0)
        
        features = np.concatenate([mean, std, max_v, min_v])
        return features.reshape(1, -1)
        
    except Exception as e:
        print(f"❌ Feature Extraction Error: {e}")
        return None

# --- THE ROUTE ---
# Notice we use @router.post, not @app.post
@router.post("/predict-cry")
async def predict_cry(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Use a safe temporary filename
    extension = file.filename.split(".")[-1] if "." in file.filename else "wav"
    # Save temp files in the parent directory's tmp folder to avoid path confusion
    temp_dir = os.path.join(BASE_DIR, '..', 'tmp')
    os.makedirs(temp_dir, exist_ok=True)
    temp_filename = os.path.join(temp_dir, f"{uuid.uuid4()}.{extension}")
    
    try:
        content = await file.read()
        with open(temp_filename, "wb") as buffer:
            buffer.write(content)
        
        features = extract_audio_features(temp_filename)
        
        if features is None:
            raise HTTPException(status_code=400, detail="Audio format not supported.")

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
        raise he
    except Exception as e:
        print(f"🔥 CRITICAL ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")
        
    finally:
        if os.path.exists(temp_filename):
            try: os.remove(temp_filename)
            except: pass