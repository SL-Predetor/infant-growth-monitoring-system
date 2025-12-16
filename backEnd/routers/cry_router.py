from fastapi import APIRouter, File, UploadFile, HTTPException
import joblib
import numpy as np
import uuid
import librosa
import os

router = APIRouter()

# --- 1. LOAD MODEL CORRECTLY ---
# Current file is in: .../backEnd/routers/
# We need to go: UP (..) -> INTO mlModels -> INTO Cry -> audio_pain_model3.pkl

current_dir = os.path.dirname(os.path.abspath(__file__))
# Note the path: .. -> mlModels -> Cry
MODEL_PATH = os.path.join(current_dir, '..', 'mlModels', 'Cry', 'audio_pain_model3.pkl')

print(f"🔍 [CryRouter] Looking for model at: {os.path.abspath(MODEL_PATH)}")

try:
    model = joblib.load(MODEL_PATH)
    print("✅ [CryRouter] Model loaded successfully!")
except Exception as e:
    print(f"❌ [CryRouter] Error loading model: {e}")
    model = None

# Labels (Ensure these match your training labels)
LABELS = {
    0: 'hunger_cry',
    1: 'pain_cry',
    2: 'normal_cry'
}

# --- 2. FEATURE EXTRACTION (168 Features) ---
def extract_audio_features(audio_path):
    try:
        audio, sample_rate = librosa.load(audio_path, sr=None)
        
        # MFCCs (42)
        mfccs = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=42)
        
        # Statistics (4 * 42 = 168 features)
        mean = np.mean(mfccs.T, axis=0)
        std = np.std(mfccs.T, axis=0)
        max_v = np.max(mfccs.T, axis=0)
        min_v = np.min(mfccs.T, axis=0)
        
        features = np.concatenate([mean, std, max_v, min_v])
        return features.reshape(1, -1)
        
    except Exception as e:
        print(f"❌ Feature Extraction Error: {e}")
        return None

# --- 3. THE PREDICTION ENDPOINT ---
@router.post("/predict-cry")
async def predict_cry(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded on Server")

    # Use a safe temporary filename
    extension = file.filename.split(".")[-1] if "." in file.filename else "wav"
    
    # Save in a 'tmp' folder outside of routers
    temp_dir = os.path.join(current_dir, '..', 'tmp')
    os.makedirs(temp_dir, exist_ok=True)
    temp_filename = os.path.join(temp_dir, f"{uuid.uuid4()}.{extension}")
    
    try:
        # Save uploaded file
        content = await file.read()
        with open(temp_filename, "wb") as buffer:
            buffer.write(content)
        
        # Extract features
        features = extract_audio_features(temp_filename)
        
        if features is None:
            raise HTTPException(status_code=400, detail="Audio format not supported.")

        # Predict
        prediction_index = model.predict(features)[0]
        
        # Get Confidence
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