from fastapi import APIRouter, File, UploadFile, HTTPException
import joblib
import numpy as np
import uuid
# import librosa  # DISABLED FOR AZURE
import os
# import noisereduce as nr  # DISABLED FOR AZURE
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
    # Temporary Azure deployment fix - heavy ML dependencies disabled
    raise HTTPException(
        status_code=503, 
        detail="Audio analysis temporarily disabled on Azure free tier. Use local deployment for full features."
    )