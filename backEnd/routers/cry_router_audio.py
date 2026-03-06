"""
Cry Audio Classification Router
================================
Two-stage GradientBoosting pipeline:
  Stage 1 (Model A): Pain (1) vs No-Pain (0)
  Stage 2 (Model B): Hunger (1) vs Normal (0)   ← only when Model A says "no pain"

Feature layout (355 features, order matches training CSV):
  feature_0  … feature_39   →  MFCC mean       (40)
  feature_40 … feature_79   →  MFCC std        (40)
  feature_80 … feature_207  →  Mel mean        (128)
  feature_208… feature_335  →  Mel std         (128)
  feature_336… feature_347  →  Chroma mean     (12)
  feature_348… feature_354  →  Contrast mean   (7)
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
import joblib
import numpy as np
import pandas as pd
import uuid
import librosa
import noisereduce as nr
from pathlib import Path

router = APIRouter()

# ──────────────────────────────────────────────
# 1.  PATHS
# ──────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "mlModels" / "Cry"

# ──────────────────────────────────────────────
# 2.  LAZY-LOADED GLOBALS
# ──────────────────────────────────────────────
model_a = None
scaler_a = None
model_b = None
scaler_b = None
FEATURE_COLUMNS: list | None = None   # canonical column order


def load_models():
    """Load models, scalers, and the saved column order (once)."""
    global model_a, scaler_a, model_b, scaler_b, FEATURE_COLUMNS

    if model_a is not None:
        return  # already loaded

    print(f"🔍 [CryRouter] Loading models from: {MODEL_DIR}")

    try:
        model_a  = joblib.load(MODEL_DIR / "model_a_pain.pkl")
        scaler_a = joblib.load(MODEL_DIR / "scaler_a.pkl")
        model_b  = joblib.load(MODEL_DIR / "model_b_hunger.pkl")
        scaler_b = joblib.load(MODEL_DIR / "scaler_b.pkl")

        # ── Load saved feature column order ──
        col_path = MODEL_DIR / "feature_columns.pkl"
        if col_path.exists():
            FEATURE_COLUMNS = joblib.load(col_path)
            print(f"✅ Loaded feature_columns.pkl  ({len(FEATURE_COLUMNS)} cols)")
        else:
            # Fallback: read names from scaler
            saved = getattr(scaler_a, "feature_names_in_", None)
            if saved is not None:
                FEATURE_COLUMNS = list(saved)
                print(f"⚠️  feature_columns.pkl missing – inferred {len(FEATURE_COLUMNS)} cols from scaler_a")
            else:
                n = getattr(scaler_a, "n_features_in_", 355)
                FEATURE_COLUMNS = [f"feature_{i}" for i in range(n)]
                print(f"⚠️  No feature names anywhere – generated {n} generic names")

        # ── Diagnostics ──
        print(f"   Model A classes   : {model_a.classes_}")
        print(f"   Model B classes   : {model_b.classes_}")
        print(f"   Scaler A features : {scaler_a.n_features_in_}")
        print(f"   Scaler B features : {scaler_b.n_features_in_}")
        print(f"   Column sample     : {FEATURE_COLUMNS[:3]} … {FEATURE_COLUMNS[-3:]}")
        print("✅ [CryRouter] All models loaded successfully!")

    except Exception as e:
        print(f"❌ [CryRouter] Failed to load models: {e}")
        raise


# ──────────────────────────────────────────────
# 3.  FEATURE EXTRACTION  →  pandas DataFrame
# ──────────────────────────────────────────────
def extract_audio_features(audio_path) -> pd.DataFrame | None:
    """
    Extract 355 audio features and return a **single-row** pandas DataFrame
    whose columns are exactly ``FEATURE_COLUMNS`` (``feature_0 … feature_354``).

    Feature extraction order mirrors training data processing:
      MFCC mean(40) → MFCC std(40) → Mel mean(128) → Mel std(128)
      → Chroma mean(12) → Spectral-contrast mean(7)  = 355 total.

    Returns ``None`` on failure.
    """
    load_models()  # ensure FEATURE_COLUMNS is available

    try:
        # ── Load audio (same params as training) ──
        audio, sr = librosa.load(audio_path, sr=22050, duration=5.0)
        print(f"🔍 Audio loaded: {len(audio)} samples, "
              f"max={np.max(np.abs(audio)):.6f}, mean={np.mean(np.abs(audio)):.6f}")

        if np.max(np.abs(audio)) < 0.01:
            print("⚠️  Very quiet audio – continuing anyway")

        # ── Noise reduction (gentle) ──
        try:
            audio = nr.reduce_noise(y=audio, sr=sr, prop_decrease=0.5)
        except Exception as ne:
            print(f"⚠️  Noise reduction skipped: {ne}")

        # ── Extract in EXACT training order ──
        features: list[float] = []

        # 1. MFCC (n_mfcc=40)  →  40 mean + 40 std = 80
        mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=40)           # (40, T)
        features.extend(np.mean(mfccs, axis=1).tolist())                   # mean
        features.extend(np.std(mfccs, axis=1).tolist())                    # std

        # 2. Mel spectrogram (n_mels=128)  →  128 mean + 128 std = 256
        mel = librosa.feature.melspectrogram(y=audio, sr=sr, n_mels=128)   # (128, T)
        features.extend(np.mean(mel, axis=1).tolist())                     # mean
        features.extend(np.std(mel, axis=1).tolist())                      # std

        # 3. Chroma (12 bins)  →  12 mean
        stft = np.abs(librosa.stft(audio))
        chroma = librosa.feature.chroma_stft(S=stft, sr=sr)               # (12, T)
        features.extend(np.mean(chroma, axis=1).tolist())

        # 4. Spectral contrast (7 bands)  →  7 mean
        contrast = librosa.feature.spectral_contrast(S=stft, sr=sr)        # (7, T)
        features.extend(np.mean(contrast, axis=1).tolist())

        # ── Align to training column count ──
        expected = len(FEATURE_COLUMNS)
        actual   = len(features)

        if actual != expected:
            print(f"⚠️  Feature count mismatch  extracted={actual}  expected={expected}")
            if actual < expected:
                features.extend([0.0] * (expected - actual))
                print(f"   → padded {expected - actual} zeros")
            else:
                features = features[:expected]
                print(f"   → truncated {actual - expected} features")

        # ── Wrap in DataFrame with correct column names ──
        features_df = pd.DataFrame([features], columns=FEATURE_COLUMNS)

        print(f"✅ Feature DataFrame: shape={features_df.shape}, "
              f"min={features_df.values.min():.4f}, max={features_df.values.max():.4f}, "
              f"mean={features_df.values.mean():.4f}")
        print(f"   columns[:5] = {features_df.columns[:5].tolist()}")
        print(f"   columns[-5:]= {features_df.columns[-5:].tolist()}")
        return features_df

    except Exception as e:
        print(f"❌ Feature extraction error: {e}")
        import traceback
        traceback.print_exc()
        return None


# ──────────────────────────────────────────────
# 4.  PREDICTION ENDPOINT
# ──────────────────────────────────────────────
@router.post("/predict-cry")
async def predict_cry(file: UploadFile = File(...)):
    load_models()

    # ── Save temp file ──
    ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "wav"
    temp_dir = BASE_DIR / "tmp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"{uuid.uuid4()}.{ext}"

    try:
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)

        # ── Extract features as DataFrame ──
        features_df = extract_audio_features(temp_path)
        if features_df is None:
            raise HTTPException(status_code=400, detail="Feature extraction failed – check audio file")

        print(f"\n{'='*55}")
        print(f"  INFERENCE  |  shape={features_df.shape}  cols={features_df.columns[:3].tolist()}…")
        print(f"{'='*55}")

        # ════════════════════════════════════════════════════
        # STAGE 1 — Pain detection  (Model A)
        #   classes_: [0, 1]  →  0 = No-Pain, 1 = Pain
        # ════════════════════════════════════════════════════
        print("\n── STAGE 1: PAIN DETECTION (Model A) ──")
        print(f"   model_a.classes_ = {model_a.classes_}")

        features_a_scaled = scaler_a.transform(features_df)       # ← DataFrame in = no warning
        print(f"   scaled: shape={features_a_scaled.shape}  "
              f"min={features_a_scaled.min():.4f}  max={features_a_scaled.max():.4f}")

        proba_a = model_a.predict_proba(features_a_scaled)[0]
        pred_a  = model_a.predict(features_a_scaled)[0]

        print(f"   predict_proba = {proba_a}")
        for cls, p in zip(model_a.classes_, proba_a):
            tag = "Pain" if cls == 1 else "No-Pain"
            print(f"      class {cls} ({tag}): {p:.4f}")
        print(f"   prediction = {pred_a}")

        is_hunger_pred = None
        proba_b = None

        if pred_a == 1:
            # ── PAIN ──
            pain_idx   = list(model_a.classes_).index(1)
            final_label = "pain_cry"
            confidence  = float(proba_a[pain_idx])
        else:
            # ════════════════════════════════════════════════
            # STAGE 2 — Hunger vs Normal  (Model B)
            #   classes_: [0, 1]  →  0 = Normal, 1 = Hunger
            # ════════════════════════════════════════════════
            print("\n── STAGE 2: HUNGER vs NORMAL (Model B) ──")
            print(f"   model_b.classes_ = {model_b.classes_}")

            features_b_scaled = scaler_b.transform(features_df)   # ← DataFrame in = no warning
            print(f"   scaled: shape={features_b_scaled.shape}  "
                  f"min={features_b_scaled.min():.4f}  max={features_b_scaled.max():.4f}")

            proba_b        = model_b.predict_proba(features_b_scaled)[0]
            is_hunger_pred = model_b.predict(features_b_scaled)[0]

            print(f"   predict_proba = {proba_b}")
            for cls, p in zip(model_b.classes_, proba_b):
                tag = "Hunger" if cls == 1 else "Normal"
                print(f"      class {cls} ({tag}): {p:.4f}")
            print(f"   prediction = {is_hunger_pred}")

            if is_hunger_pred == 1:
                hunger_idx  = list(model_b.classes_).index(1)
                final_label = "hunger_cry"
                confidence  = float(proba_b[hunger_idx])
            else:
                normal_idx  = list(model_b.classes_).index(0)
                final_label = "normal_cry"
                confidence  = float(proba_b[normal_idx])

        print(f"\n🎯 RESULT  →  {final_label}   confidence={confidence:.4f}")

        return {
            "label": final_label,
            "confidence": confidence,
            "message": f"Detected: {final_label.replace('_', ' ').title()}",
            "debug_info": {
                "feature_shape": list(features_df.shape),
                "feature_columns_sample": features_df.columns[:5].tolist(),
                "pain_prediction": int(pred_a),
                "pain_probabilities": proba_a.tolist(),
                "hunger_prediction": int(is_hunger_pred) if is_hunger_pred is not None else None,
                "hunger_probabilities": proba_b.tolist() if proba_b is not None else None,
                "model_a_classes": model_a.classes_.tolist(),
                "model_b_classes": model_b.classes_.tolist(),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"🔥 CRITICAL: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass