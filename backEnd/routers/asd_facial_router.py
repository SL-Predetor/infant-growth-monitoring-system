# ASD Facial Prediction Router (scaffold)

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image
import io
import tensorflow as tf
import joblib
import os

router = APIRouter()

# Paths to model artifacts (update as needed)
CNN_MODEL_PATH = os.path.join("..", "mlModels", "autisumDetect", "sector1", "Stage_4", "models", "fold_5_best.h5")
SCALER_PATH = os.path.join("..", "mlModels", "autisumDetect", "sector1", "Stage_4", "models", "logreg_probe_scaler.pkl")
LOGREG_PATH = os.path.join("..", "mlModels", "autisumDetect", "sector1", "Stage_4", "models", "logreg_probe_model.pkl")

# Load models at startup
try:
    cnn_model = tf.keras.models.load_model(CNN_MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    logreg = joblib.load(LOGREG_PATH)
except Exception as e:
    cnn_model = None
    scaler = None
    logreg = None
    print(f"[ASD Facial Router] Model load error: {e}")

@router.post("/asd/predict-face")
async def predict_asd_face(file: UploadFile = File(...)):
    if not cnn_model or not scaler or not logreg:
        raise HTTPException(status_code=500, detail="Model not loaded.")
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        image = image.resize((224, 224))
        img_array = np.array(image) / 255.0
        img_array = np.expand_dims(img_array, axis=0)
        embedding = cnn_model.predict(img_array)
        embedding_scaled = scaler.transform(embedding)
        prob = logreg.predict_proba(embedding_scaled)[0][1]
        label = int(prob > 0.5)
        return JSONResponse({
            "asd_probability": float(prob),
            "label": label,
            "confidence": float(abs(prob - 0.5) * 2)
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {e}")
