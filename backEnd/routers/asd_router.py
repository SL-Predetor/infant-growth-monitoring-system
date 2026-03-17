import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
"""
ASD Detection Router
====================
Endpoints (mounted under /asd by app.py):

  GET  /asd/status          — Model health check
  POST /asd/predict-face    — Infant face image → VGG-Face CNN → LogReg probe → P(ASD)
  POST /asd/predict-video   — Infant face video → frames every 3s → soft-avg P(ASD)
  POST /asd/predict-qchat   — 12 Q-CHAT-10 features → XGBoost → P(ASD)
  POST /asd/predict-fused   — α-weighted late fusion (α=0.15 facial, 0.85 Q-CHAT) + save to Supabase

VGG-Face preprocessing: resize 224x224, BGR (from OpenCV), subtract [93.5940, 104.7624, 129.1863]
Label convention (both models): 1 = ASD, 0 = Non-ASD
Fusion weight: α=0.15 (optimal from sector3 Monte-Carlo simulation, AUC=0.9994)
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel, validator
import joblib
import numpy as np
import pandas as pd
import cv2
import tensorflow as tf
import tf_keras as keras_legacy
from pathlib import Path
import tempfile
import os
import hashlib
import math
from typing import Optional
import mtcnn.mtcnn

router = APIRouter()

# ──────────────────────────────────────────────
# 1.  PATHS
# ──────────────────────────────────────────────
ROUTER_DIR   = Path(__file__).resolve().parent        # backEnd/routers/
BACKEND_DIR  = ROUTER_DIR.parent                      # backEnd/
PROJECT_ROOT = BACKEND_DIR.parent                     # project root
ML_ROOT      = ML_ROOT = BACKEND_DIR / "mlModels" / "autisumDetect"

# Facial stream
H5_PATH      = ML_ROOT / "sector1/Stage_4/models/fold_5_best.h5"
SCALER_PATH  = ML_ROOT / "sector1/Stage_4/models/logreg_probe_scaler.pkl"
LOGREG_PATH  = ML_ROOT / "sector1/Stage_4/models/logreg_probe_model.pkl"

# Q-CHAT stream
XGBOOST_PATH  = ML_ROOT / "sector2/Stage_2/models/xgboost_qchat_stage2.pkl"
FEATURES_PATH = ML_ROOT / "sector2/Stage_2/models/qchat_feature_columns.pkl"

# ──────────────────────────────────────────────
# 2.  FUSION CONSTANTS
# ──────────────────────────────────────────────
ALPHA              = 0.15   # facial weight; Q-CHAT weight = 1 - ALPHA = 0.85
FACIAL_THRESHOLD   = 0.06
QCHAT_THRESHOLD    = 0.35
FUSION_THRESHOLD   = 0.35

# ──────────────────────────────────────────────
# 3.  MODEL LOADING — AT MODULE LEVEL
# ──────────────────────────────────────────────
print("[ASD] Loading models...")

# --- Facial stream ---
for path in (H5_PATH, SCALER_PATH, LOGREG_PATH):
    if not path.exists():
        raise RuntimeError(f"[ASD] Model file not found: {path}")

vgg_model     = keras_legacy.models.load_model(str(H5_PATH), compile=False)
logreg_scaler = joblib.load(SCALER_PATH)
logreg_model  = joblib.load(LOGREG_PATH)

# Build the 256-D embedding sub-model once at startup (not per request)
intermediate_model = keras_legacy.Model(
    inputs=vgg_model.input,
    outputs=vgg_model.get_layer("asd_feature_vector_256").output,
)

# --- Q-CHAT stream ---
for path in (XGBOOST_PATH, FEATURES_PATH):
    if not path.exists():
        raise RuntimeError(f"[ASD] Model file not found: {path}")

xgboost_model   = joblib.load(XGBOOST_PATH)
feature_columns = joblib.load(FEATURES_PATH)

print(f"[ASD] All models loaded. Q-CHAT features: {feature_columns}")

# --- MTCNN face detector ---
mtcnn_detector = mtcnn.mtcnn.MTCNN()
print("[ASD] MTCNN detector ready.")

print("[ASD] Ready.")

# ──────────────────────────────────────────────
# 4.  SUPABASE — lazy import to avoid startup crash if DB is down
# ──────────────────────────────────────────────
def _get_supabase():
    try:
        from database import supabase
        return supabase
    except Exception as e:
        print(f"[ASD] Supabase unavailable: {e}")
        return None

# ──────────────────────────────────────────────
# 5.  HELPERS
# ──────────────────────────────────────────────
def _detect_and_crop_face(bgr_frame: np.ndarray, margin: float = 0.1) -> Optional[np.ndarray]:
    """
    Run MTCNN on a BGR frame (converted to RGB internally).
    Returns the cropped + margin-expanded face as a BGR array,
    or None if no face is detected.
    Matches the preprocessing in sector1/Prep/prep1.ipynb (margin=0.1).
    """
    rgb = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
    detections = mtcnn_detector.detect_faces(rgb)
    if not detections:
        return None

    # Pick the detection with the highest confidence
    best = max(detections, key=lambda d: d["confidence"])
    x, y, w, h = best["box"]
    x, y = max(0, x), max(0, y)

    H, W = bgr_frame.shape[:2]
    mx = int(w * margin)
    my = int(h * margin)
    x1 = max(0, x - mx)
    y1 = max(0, y - my)
    x2 = min(W, x + w + mx)
    y2 = min(H, y + h + my)

    face = bgr_frame[y1:y2, x1:x2]
    return face if face.size > 0 else None


def _infer_frame(bgr_frame: np.ndarray) -> tuple[float, Optional[np.ndarray]]:
    """
    MTCNN crop → VGG-Face preprocess → CNN embedding → LogReg → P(ASD).
    Returns (probability, cropped_face_bgr).
    cropped_face_bgr is None if MTCNN found no face (raw frame used as fallback).
    """
    cropped = _detect_and_crop_face(bgr_frame)
    face    = cropped if cropped is not None else bgr_frame   # fallback: raw frame

    img = cv2.resize(face, (224, 224)).astype(np.float32)
    img[:, :, 0] -= 93.5940
    img[:, :, 1] -= 104.7624
    img[:, :, 2] -= 129.1863
    batch     = np.expand_dims(img, axis=0)
    embedding = intermediate_model.predict(batch, verbose=0)
    scaled    = logreg_scaler.transform(embedding)
    prob      = float(logreg_model.predict_proba(scaled)[0][1])
    return prob, cropped

# ──────────────────────────────────────────────
# 6.  ENDPOINT: Health Check
# ──────────────────────────────────────────────
@router.get("/status")
def asd_status():
    return {
        "status": "ok",
        "models": {
            "vgg_face":      vgg_model is not None,
            "logreg_probe":  logreg_model is not None,
            "xgboost_qchat": xgboost_model is not None,
        },
        "fusion_alpha":     ALPHA,
        "fusion_threshold": FUSION_THRESHOLD,
    }

# ──────────────────────────────────────────────
# 7.  ENDPOINT: Single Image → P(ASD)
# ──────────────────────────────────────────────
@router.post("/predict-face")
async def predict_asd_face(file: UploadFile = File(...)):
    """
    Upload an infant face image.
    Pipeline: decode (BGR) → resize 224x224 → mean-subtract → CNN → 256-D embedding
              → StandardScaler → LogReg probe → P(ASD).
    """
    try:
        contents = await file.read()
        nparr    = np.frombuffer(contents, np.uint8)
        img      = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(
                status_code=400,
                detail="Could not decode image. Please upload a valid JPEG or PNG.",
            )

        p_facial, _ = _infer_frame(img)
        confidence = "High" if p_facial >= 0.80 else ("Moderate" if p_facial >= 0.50 else "Low")
        label      = "ASD Risk Detected" if p_facial >= FACIAL_THRESHOLD else "Low ASD Risk"

        return {
            "asd_probability":  round(p_facial, 4),
            "label":            label,
            "confidence":       confidence,
            "threshold_used":   FACIAL_THRESHOLD,
            "frames_processed": 1,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Internal server error", "detail": str(e), "endpoint": "/asd/predict-face"},
        )

# ──────────────────────────────────────────────
# 8.  ENDPOINT: Video → P(ASD)  (1 frame every 3 seconds)
# ──────────────────────────────────────────────
@router.post("/predict-video")
async def predict_asd_video(file: UploadFile = File(...)):
    """
    Upload a short video (≤10s) of an infant's face.
    Extracts 1 frame every 3 seconds, runs each through VGG-Face CNN → LogReg probe,
    then soft-averages the ASD probabilities.
    """
    suffix   = ".mp4"
    if file.filename:
        ext = Path(file.filename).suffix.lower()
        if ext in (".mp4", ".mov", ".avi", ".mkv", ".m4v"):
            suffix = ext

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video file.")

        fps          = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = total_frames / fps

        # One frame every 3 seconds (frames at 3s, 6s, 9s for a 10s video)
        INTERVAL     = 3.0
        sample_times = list(np.arange(INTERVAL, duration_sec + 0.1, INTERVAL))
        if not sample_times:
            sample_times = [duration_sec / 2]   # fallback: middle frame

        probabilities = []
        frame_preds   = []
        frame_urls    = []

        # Lazy Supabase client — used for frame image upload
        sb = _get_supabase()

        for t in sample_times:
            frame_idx = min(int(t * fps), total_frames - 1)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            p, cropped_face = _infer_frame(frame)
            probabilities.append(p)
            frame_preds.append({"time_sec": round(t, 1), "asd_probability": round(p, 4)})

            # ── MD5-based frame upload to Supabase Storage ─────────────────
            face_to_store = cropped_face if cropped_face is not None else frame
            ok, buf = cv2.imencode(".jpg", face_to_store, [cv2.IMWRITE_JPEG_QUALITY, 90])
            if ok and sb is not None:
                try:
                    img_bytes = buf.tobytes()
                    md5_hash  = hashlib.md5(img_bytes).hexdigest()
                    filename  = f"{md5_hash}.jpg"
                    # upsert=True skips re-upload if identical frame seen before
                    sb.storage.from_("asd-frames").upload(
                        path=filename,
                        file=img_bytes,
                        file_options={"content-type": "image/jpeg", "upsert": "true"},
                    )
                    public_url = sb.storage.from_("asd-frames").get_public_url(filename)
                    frame_urls.append(public_url)
                except Exception as upload_err:
                    print(f"[ASD] Frame upload skipped: {upload_err}")

        cap.release()

        if not probabilities:
            raise HTTPException(
                status_code=400,
                detail="No valid frames could be extracted from the video.",
            )

        p_facial   = float(np.mean(probabilities))
        label      = "ASD Risk Detected" if p_facial >= FACIAL_THRESHOLD else "Low ASD Risk"
        confidence = "High" if p_facial >= 0.80 else ("Moderate" if p_facial >= 0.50 else "Low")

        return {
            "asd_probability":   round(p_facial, 4),
            "label":             label,
            "confidence":        confidence,
            "threshold_used":    FACIAL_THRESHOLD,
            "frames_processed":  len(probabilities),
            "frame_predictions": frame_preds,
            "duration_sec":      round(duration_sec, 1),
            "frame_urls":        frame_urls,   # uploaded cropped-face images (MD5-named)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Internal server error", "detail": str(e), "endpoint": "/asd/predict-video"},
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

# ──────────────────────────────────────────────
# 9.  ENDPOINT: Q-CHAT-10 → P(ASD)
# ──────────────────────────────────────────────
class QChatInput(BaseModel):
    # Q-CHAT-10 binary scored answers (0=typical, 1=atypical)
    A1:  int
    A2:  int
    A3:  int
    A4:  int
    A5:  int
    A6:  int
    A7:  int
    A8:  int
    A9:  int
    A10: int
    # Demographics
    Sex_M:                   int   # 1=Male, 0=Female
    Family_mem_with_ASD_Yes: int   # 1=Yes, 0=No

    @validator("A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10",
               "Sex_M", "Family_mem_with_ASD_Yes", pre=True)
    def must_be_binary(cls, v):
        if v not in [0, 1]:
            raise ValueError("All answers must be 0 or 1")
        return v


@router.post("/predict-qchat")
async def predict_asd_qchat(data: QChatInput):
    """
    Submit the 12 Q-CHAT-10 + demographic features.
    Pipeline: XGBoost (parent-only training subset, AUC=0.9769).
    Returns P(ASD), risk label, raw Q-CHAT score, and confidence.
    """
    try:
        row = {col: 0 for col in feature_columns}
        row["A1"]  = data.A1
        row["A2"]  = data.A2
        row["A3"]  = data.A3
        row["A4"]  = data.A4
        row["A5"]  = data.A5
        row["A6"]  = data.A6
        row["A7"]  = data.A7
        row["A8"]  = data.A8
        row["A9"]  = data.A9
        row["A10"] = data.A10
        row["Sex_M"]                   = data.Sex_M
        row["Family_mem_with_ASD_Yes"] = data.Family_mem_with_ASD_Yes

        df      = pd.DataFrame([row])[feature_columns]
        p_qchat = float(xgboost_model.predict_proba(df)[0][1])

        qchat_score    = sum([data.A1, data.A2, data.A3, data.A4, data.A5,
                               data.A6, data.A7, data.A8, data.A9, data.A10])
        score_exceeded = qchat_score >= 3
        label          = "ASD Risk Detected" if p_qchat >= QCHAT_THRESHOLD else "Low ASD Risk"

        return {
            "asd_probability": round(p_qchat, 4),
            "label":           label,
            "confidence":      "High" if p_qchat >= 0.80 else ("Moderate" if p_qchat >= 0.50 else "Low"),
            "qchat_score":     qchat_score,
            "score_threshold": 3,
            "score_exceeded":  score_exceeded,
            "threshold_used":  QCHAT_THRESHOLD,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Internal server error", "detail": str(e), "endpoint": "/asd/predict-qchat"},
        )

# ──────────────────────────────────────────────
# 10.  ENDPOINT: Late Fusion + Save to Supabase
# ──────────────────────────────────────────────
class FusionInput(BaseModel):
    p_facial:      float
    p_qchat:       float
    qchat_score:   int
    infant_id:     Optional[str]  = None   # UUID from Supabase infants table (optional)
    qchat_answers: Optional[dict] = None   # raw answers for storage
    frame_urls:    Optional[list] = None   # MD5-named cropped face images from video endpoint


@router.post("/predict-fused")
async def predict_asd_fused(data: FusionInput):
    """
    α-weighted late fusion:
      p_final = 0.15 * p_facial + 0.85 * p_qchat

    Saves result to Supabase asd_predictions table if infant_id is provided.
    """
    try:
        if not (0.0 <= data.p_facial <= 1.0):
            raise HTTPException(status_code=400, detail="p_facial must be in [0, 1].")
        if not (0.0 <= data.p_qchat <= 1.0):
            raise HTTPException(status_code=400, detail="p_qchat must be in [0, 1].")

        p_final = ALPHA * data.p_facial + (1 - ALPHA) * data.p_qchat

        if p_final >= FUSION_THRESHOLD:
            risk_level     = "High"
            recommendation = (
                "Your child's responses suggest a higher likelihood of ASD. "
                "We strongly recommend consulting a pediatric specialist or "
                "developmental pediatrician for a full assessment."
            )
            color = "red"
        elif p_final >= 0.20:
            risk_level     = "Moderate"
            recommendation = (
                "Some indicators were noted. Consider discussing these results "
                "with your child's pediatrician at your next visit."
            )
            color = "orange"
        else:
            risk_level     = "Low"
            recommendation = (
                "No significant indicators were detected. Continue monitoring "
                "your child's development at regular checkups."
            )
            color = "green"

        result = {
            "fused_probability":        round(p_final, 4),
            "risk_level":               risk_level,
            "risk_color":               color,
            "recommendation":           recommendation,
            "facial_probability":       round(data.p_facial, 4),
            "qchat_probability":        round(data.p_qchat, 4),
            "facial_weight":            ALPHA,
            "qchat_weight":             round(1 - ALPHA, 2),
            "qchat_score":              data.qchat_score,
            "score_exceeded_threshold": data.qchat_score >= 3,
            "disclaimer": (
                "This is a screening tool only and does not constitute a clinical diagnosis. "
                "Always consult a qualified healthcare professional."
            ),
        }

        # Save to Supabase (non-blocking — don't fail the request if DB is down)
        try:
            sb = _get_supabase()
            if sb is not None:
                record = {
                    "facial_prob":    round(data.p_facial, 4),
                    "qchat_prob":     round(data.p_qchat, 4),
                    "fused_prob":     round(p_final, 4),
                    "label":          risk_level,
                    "confidence":     risk_level,
                    "qchat_answers":  data.qchat_answers or {},
                    "frame_urls":     data.frame_urls or [],
                }
                if data.infant_id:
                    record["infant_id"] = data.infant_id
                sb.table("asd_predictions").insert(record).execute()
                print(f"[ASD] Prediction saved to Supabase. risk={risk_level}")
        except Exception as db_err:
            print(f"[ASD] Supabase save failed (non-fatal): {db_err}")

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "Internal server error", "detail": str(e), "endpoint": "/asd/predict-fused"},
        )
