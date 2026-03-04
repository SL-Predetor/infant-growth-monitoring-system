from fastapi import APIRouter, File, UploadFile, HTTPException
import joblib
import numpy as np
import uuid
import librosa
import os
import noisereduce as nr  # <--- NEW IMPORT
from pathlib import Path

router = APIRouter()

# --- 1. SETUP PATHS ---
BASE_DIR = Path(__file__).resolve().parent.parent

# --- 2. LAZY LOAD MODELS (GLOBAL VARIABLES) ---
model_a = None
scaler_a = None
model_b = None
scaler_b = None

def load_models():
    """Lazy load models only when needed (on first prediction call)"""
    global model_a, scaler_a, model_b, scaler_b
    
    if model_a is not None:
        return  # Already loaded
    
    print(f"🔍 [CryRouter] Loading models from: {BASE_DIR / 'mlModels' / 'Cry'}")
    
    try:
        model_a = joblib.load(BASE_DIR / 'mlModels' / 'Cry' / 'model_a_pain.pkl')
        scaler_a = joblib.load(BASE_DIR / 'mlModels' / 'Cry' / 'scaler_a.pkl')
        model_b = joblib.load(BASE_DIR / 'mlModels' / 'Cry' / 'model_b_hunger.pkl')
        scaler_b = joblib.load(BASE_DIR / 'mlModels' / 'Cry' / 'scaler_b.pkl')
        print("✅ [CryRouter] All Models & Scalers loaded successfully!")
    except Exception as e:
        print(f"❌ [CryRouter] Error loading models. Check file names! Error: {e}")
        raise

# --- 3. FEATURE EXTRACTOR (With Noise Cancellation) ---
def extract_audio_features(audio_path):
    try:
        # FIX 1: Force exactly 5.0 seconds
        audio, sample_rate = librosa.load(audio_path, sr=22050, duration=5.0)
        
        # Check for silence
        if np.max(np.abs(audio)) < 0.005:
            print("⚠️ WARNING: Audio file is silent!")
            return None

        # FIX 2: Apply Noise Cancellation
        try:
            # Prop_decrease=0.8 removes 80% of background noise (fans, wind)
            audio = nr.reduce_noise(y=audio, sr=sample_rate, prop_decrease=0.8)
        except Exception as ne:
            print(f"⚠️ Noise reduction failed (skipping): {ne}")

        features = []
        
        # 1. MFCC (Mean + Std)
        mfccs = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=40)
        features.append(np.mean(mfccs, axis=1))
        features.append(np.std(mfccs, axis=1))

        # 2. Mel Spectrogram (Mean + Std)
        mel = librosa.feature.melspectrogram(y=audio, sr=sample_rate, n_mels=128)
        features.append(np.mean(mel, axis=1))
        features.append(np.std(mel, axis=1))
        
        # 3. Chroma (Mean)
        stft = np.abs(librosa.stft(y=audio))
        chroma = librosa.feature.chroma_stft(S=stft, sr=sample_rate)
        features.append(np.mean(chroma, axis=1))

        # 4. Spectral Contrast (Mean)
        contrast = librosa.feature.spectral_contrast(S=stft, sr=sample_rate)
        features.append(np.mean(contrast, axis=1))
        
        # Combine: 355 Features
        final_features = np.concatenate(features)
        return final_features.reshape(1, -1)
        
    except Exception as e:
        print(f"❌ Feature Extraction Error: {e}")
        return None

# --- 4. PREDICTION ROUTE ---
@router.post("/predict-cry")
async def predict_cry(file: UploadFile = File(...)):
    load_models()  # Lazy load models on first call
    
    # Save Temp File
    extension = file.filename.split(".")[-1] if "." in file.filename else "wav"
    temp_dir = BASE_DIR / 'tmp'
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_filename = temp_dir / f"{uuid.uuid4()}.{extension}"
    
    try:
        content = await file.read()
        with open(temp_filename, "wb") as buffer:
            buffer.write(content)
        
        # Extract Features (Includes Noise Reduction)
        raw_features = extract_audio_features(temp_filename)
        
        if raw_features is None:
            raise HTTPException(status_code=400, detail="Audio is silent or invalid format")

        # --- 🧠 STAGE 1: IS IT PAIN? (Model A) ---
        features_a = scaler_a.transform(raw_features)
        
        is_pain_prob = model_a.predict_proba(features_a)[0]
        is_pain = model_a.predict(features_a)[0]
        
        print(f"🧠 Stage 1 (Pain): Prediction={is_pain}, Probs={is_pain_prob}")

        if is_pain == 1:
            final_label = "pain_cry"
            confidence = float(is_pain_prob[1])
        else:
            # --- 🧠 STAGE 2: HUNGER OR NORMAL? (Model B) ---
            features_b = scaler_b.transform(raw_features)
            
            is_hunger_prob = model_b.predict_proba(features_b)[0]
            is_hunger = model_b.predict(features_b)[0]
            
            print(f"🧠 Stage 2 (Hunger/Normal): Prediction={is_hunger}, Probs={is_hunger_prob}")

            if is_hunger == 1:
                final_label = "hunger_cry"
                confidence = float(is_hunger_prob[1])
            else:
                final_label = "normal_cry"
                confidence = float(is_hunger_prob[0])

        return {
            "label": final_label,
            "confidence": confidence,
            "message": f"Detected: {final_label.replace('_', ' ').title()}"
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"🔥 CRITICAL ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        if temp_filename.exists():
            try:
                temp_filename.unlink()
            except:
                pass