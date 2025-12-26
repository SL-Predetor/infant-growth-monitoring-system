from fastapi import APIRouter, File, UploadFile, HTTPException
import numpy as np
from PIL import Image
import io
import os

# --- SMART IMPORT BLOCK ---
# This handles the difference between TensorFlow versions automatically
try:
    # Option 1: Try standalone Keras (TF 2.16+)
    import keras
    from keras.models import load_model
    print("✅ [FaceRouter] Using standalone Keras")
except (ImportError, ModuleNotFoundError):
    try:
        # Option 2: Fallback to TensorFlow's internal Keras (TF < 2.16)
        import tensorflow as tf
        from tensorflow.keras.models import load_model
        print(f"✅ [FaceRouter] Using TensorFlow {tf.__version__} internal Keras")
    except Exception as e:
        print(f"❌ [FaceRouter] CRITICAL: Could not import Keras. Error: {e}")
        # Stop here if neither works
        raise ImportError("Please run: pip install tensorflow keras")

router = APIRouter()

# --- 1. SETUP PATHS ---
current_dir = os.path.dirname(os.path.abspath(__file__))
# Point to your .keras file
MODEL_PATH = os.path.join(current_dir, '..', 'mlModels', 'Cry', 'facial_pain_model.keras')

print(f"🔍 [FaceRouter] Looking for model at: {os.path.abspath(MODEL_PATH)}")

# --- 2. LOAD KERAS MODEL ---
face_model = None

def load_face_model():
    global face_model
    try:
        if not os.path.exists(MODEL_PATH):
            print(f"⚠️ [FaceRouter] Model file NOT found at: {MODEL_PATH}")
            return

        # Use the 'load_model' we imported safely above
        face_model = load_model(MODEL_PATH, compile=False)
        print("✅ [FaceRouter] Face Model loaded successfully!")
    except Exception as e:
        print(f"❌ [FaceRouter] Error loading model: {e}")
        face_model = None

# Load immediately on startup
load_face_model()

# --- 3. PREPROCESSING FUNCTION ---
def prepare_image(image_bytes):
    try:
        # Open image from bytes
        img = Image.open(io.BytesIO(image_bytes))
        
        # Ensure RGB
        img = img.convert('RGB')
        
        # Resize to 224x224 (Standard for MobileNetV2)
        img = img.resize((224, 224))
        
        # Convert to Array
        img_array = np.array(img)
        
        # Normalize (0-1)
        img_array = img_array / 255.0
        
        # Add Batch Dimension: (1, 224, 224, 3)
        return np.expand_dims(img_array, axis=0)
    except Exception as e:
        print(f"Image processing error: {e}")
        return None

# --- 4. PREDICTION ROUTE ---
@router.post("/predict-face")
async def predict_face(file: UploadFile = File(...)):
    if face_model is None:
        load_face_model()
        if face_model is None:
            raise HTTPException(status_code=503, detail="Face model could not be loaded.")

    try:
        # Read file
        contents = await file.read()
        
        # Preprocess
        processed_img = prepare_image(contents)
        if processed_img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # Predict
        prediction = face_model.predict(processed_img, verbose=0)
        
        # --- Handle Different Output Shapes ---
        # Softmax (2 classes) vs Sigmoid (1 class)
        if prediction.shape[-1] > 1:
            pain_probability = float(prediction[0][1])
        else:
            pain_probability = float(prediction[0][0])
        
        # Logic: Threshold at 0.5
        if pain_probability > 0.5:
            label = "pain_expression"
            confidence = pain_probability
            msg = "Detected: Painful Expression 😣"
        else:
            label = "no_pain"
            confidence = 1.0 - pain_probability
            msg = "Detected: No Pain / Neutral 🙂"

        return {
            "label": label,
            "confidence": round(confidence * 100, 2),
            "raw_score": pain_probability,
            "message": msg
        }

    except Exception as e:
        print(f"🔥 Prediction Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))