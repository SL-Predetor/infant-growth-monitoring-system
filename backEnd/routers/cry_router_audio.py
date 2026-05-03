from fastapi import APIRouter, File, UploadFile, HTTPException
import joblib
import numpy as np
import uuid
import librosa
import os
import subprocess
import traceback
import noisereduce as nr

router = APIRouter()

# --- 1. SETUP PATHS ---
current_dir = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(current_dir, '..', '..', 'mlModels', 'Cry')

# Model A: Pain vs No Pain
MODEL_A_PATH = os.path.join(MODELS_DIR, 'model_a_pain.pkl')
SCALER_A_PATH = os.path.join(MODELS_DIR, 'scaler_a.pkl')

# Model B: Hunger vs Normal
MODEL_B_PATH = os.path.join(MODELS_DIR, 'model_b_hunger.pkl')
SCALER_B_PATH = os.path.join(MODELS_DIR, 'scaler_b.pkl')

print(f"🔍 [CryRouter] Loading models from: {os.path.abspath(MODELS_DIR)}")

# --- 2. LOAD MODELS ---
models = {}
try:
    models['model_a'] = joblib.load(MODEL_A_PATH)
    models['scaler_a'] = joblib.load(SCALER_A_PATH)
    models['model_b'] = joblib.load(MODEL_B_PATH)
    models['scaler_b'] = joblib.load(SCALER_B_PATH)
    print("✅ [CryRouter] All Models & Scalers loaded successfully!")
except Exception as e:
    print(f"❌ [CryRouter] Error loading models. Check file names! Error: {e}")
    models = None

# Explicit path to the bundled ffmpeg.exe in backEnd/
FFMPEG_EXE = os.path.abspath(os.path.join(current_dir, '..', 'ffmpeg.exe'))
print(f"✅ [CryRouter] ffmpeg path: {FFMPEG_EXE}")

# --- 3. FFMPEG CONVERSION (webm/ogg/m4a → wav for reliable librosa loading) ---
def convert_to_wav(input_path: str) -> str | None:
    wav_path = input_path.rsplit('.', 1)[0] + '_conv.wav'
    ffmpeg_cmd = FFMPEG_EXE if os.path.exists(FFMPEG_EXE) else 'ffmpeg'
    try:
        result = subprocess.run(
            [ffmpeg_cmd, '-y', '-i', input_path, '-ar', '22050', '-ac', '1', '-f', 'wav', wav_path],
            capture_output=True, timeout=30
        )
        if result.returncode != 0:
            print(f"ffmpeg conversion failed (code {result.returncode}): {result.stderr[-300:]}")
            return None
        print(f"✅ ffmpeg converted to wav: {wav_path}")
        return wav_path
    except Exception as e:
        print(f"ffmpeg conversion error: {e}")
        return None

# --- 4. FEATURE EXTRACTOR (With Noise Cancellation) ---
def extract_audio_features(audio_path):
    converted_path = None
    try:
        # Convert non-wav formats (webm, ogg, m4a) via ffmpeg for reliable decoding
        ext = os.path.splitext(audio_path)[1].lower()
        load_path = audio_path
        if ext not in ('.wav', '.mp3', '.flac'):
            converted_path = convert_to_wav(audio_path)
            if converted_path and os.path.exists(converted_path):
                load_path = converted_path
                print(f"✅ Converted {ext} → wav for librosa")
            else:
                print(f"⚠️ ffmpeg conversion failed, trying direct load")

        # FIX 1: Force exactly 5.0 seconds
        audio, sample_rate = librosa.load(load_path, sr=22050, duration=5.0)
        
        # Log amplitude for diagnostics (no longer rejecting low-amplitude audio)
        max_amplitude = float(np.max(np.abs(audio)))
        print(f"🔊 Audio max amplitude: {max_amplitude:.6f}")
        if max_amplitude < 0.001:
            print("⚠️ WARNING: Audio is nearly silent — proceeding anyway")

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
        traceback.print_exc()
        return None
    finally:
        if converted_path and os.path.exists(converted_path):
            try: os.remove(converted_path)
            except: pass

# --- 4. PREDICTION ROUTE ---
@router.post("/predict-cry")
async def predict_cry(file: UploadFile = File(...)):
    print(f"Received file: {file.filename}")
    print(f"Content type: {file.content_type}")
    content = await file.read()
    print(f"File size bytes: {len(content)}")

    if models is None:
        raise HTTPException(status_code=503, detail="Models not loaded properly")

    # Map MIME type to file extension
    content_types_map = {
        "audio/wav": "wav",
        "audio/webm": "webm",
        "audio/mpeg": "mp3",
        "audio/mp4": "m4a",
        "audio/ogg": "ogg",
        "audio/webm;codecs=pcm": "webm",
        "audio/webm; codecs=opus": "webm",
        "audio/webm;codecs=opus": "webm",
        "video/webm": "webm"
    }
    content_type_clean = (file.content_type or "").split(";")[0].strip().lower()
    ext_from_mime = content_types_map.get(file.content_type) or content_types_map.get(content_type_clean)
    if ext_from_mime:
        extension = ext_from_mime
    else:
        extension = file.filename.split(".")[-1] if "." in (file.filename or "") else "wav"
    temp_dir = os.path.join(current_dir, '..', 'tmp')
    os.makedirs(temp_dir, exist_ok=True)
    temp_filename = os.path.join(temp_dir, f"{uuid.uuid4()}.{extension}")

    try:
        with open(temp_filename, "wb") as buffer:
            buffer.write(content)
        
        # Extract Features (Includes Noise Reduction)
        raw_features = extract_audio_features(temp_filename)
        
        if raw_features is None:
            raise HTTPException(status_code=400, detail="Audio is silent or invalid format")

        # --- 🧠 STAGE 1: IS IT PAIN? (Model A) ---
        features_a = models['scaler_a'].transform(raw_features)
        
        is_pain_prob = models['model_a'].predict_proba(features_a)[0]
        is_pain = models['model_a'].predict(features_a)[0]
        
        print(f"🧠 Stage 1 (Pain): Prediction={is_pain}, Probs={is_pain_prob}")

        if is_pain == 1:
            final_label = "pain_cry"
            confidence = float(is_pain_prob[1])
        else:
            # --- 🧠 STAGE 2: HUNGER OR NORMAL? (Model B) ---
            features_b = models['scaler_b'].transform(raw_features)
            
            is_hunger_prob = models['model_b'].predict_proba(features_b)[0]
            is_hunger = models['model_b'].predict(features_b)[0]
            
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
        if os.path.exists(temp_filename):
            try: os.remove(temp_filename)
            except: pass