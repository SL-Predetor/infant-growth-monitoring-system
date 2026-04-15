from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import joblib
import pandas as pd
import os
from typing import Dict

router = APIRouter()

# ==============================
# LOAD TRAINED MODEL & ENCODER
# ==============================
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "mlModels", "Cry")
MODEL_PATH = os.path.join(MODEL_DIR, "fusion_model_calibrated.pkl")
ENCODER_PATH = os.path.join(MODEL_DIR, "fusion_label_encoder.pkl")

# Load model and encoder at startup
try:
    calibrated_model = joblib.load(MODEL_PATH)
    label_encoder = joblib.load(ENCODER_PATH)
    print("✅ Fusion model and encoder loaded successfully!")
except Exception as e:
    print(f"❌ Error loading fusion model: {e}")
    calibrated_model = None
    label_encoder = None

# ==============================
# REQUEST MODEL
# ==============================
class FusionPredictionRequest(BaseModel):
    baby_age_months: float = Field(..., ge=0, le=36, description="Baby age in months (0-36)")
    audio_predicted_class: str = Field(..., description="Audio model prediction: Hunger, Pain, Discomfort, Tiredness")
    audio_confidence: float = Field(..., ge=0, le=1, description="Audio model confidence (0-1)")
    image_predicted_class: str = Field(..., description="Image model prediction: Pain, No-Pain")
    image_confidence: float = Field(..., ge=0, le=1, description="Image model confidence (0-1)")
    time_since_feed_hours: float = Field(..., ge=0, description="Hours since last feeding")
    time_since_sleep_hours: float = Field(..., ge=0, description="Hours since last sleep")
    diaper_status: str = Field(..., description="Diaper status: Clean, Wet, Soiled")
    room_temperature_celsius: float = Field(..., ge=15, le=35, description="Room temperature in Celsius")

    class Config:
        json_schema_extra = {
            "example": {
                "baby_age_months": 6,
                "audio_predicted_class": "Hunger",
                "audio_confidence": 0.82,
                "image_predicted_class": "No-Pain",
                "image_confidence": 0.76,
                "time_since_feed_hours": 4.5,
                "time_since_sleep_hours": 1.2,
                "diaper_status": "Clean",
                "room_temperature_celsius": 26
            }
        }

# ==============================
# PREDICTION ENDPOINT
# ==============================
@router.post("/predict")
async def predict_cry_reason(request: FusionPredictionRequest):
    """
    Analyzes multiple inputs to predict the true reason for infant crying.
    
    Combines audio analysis, facial expression analysis, and contextual information
    to provide an accurate prediction of why the baby is crying.
    """
    
    # Check if model is loaded
    if calibrated_model is None or label_encoder is None:
        raise HTTPException(
            status_code=500,
            detail="Fusion model not loaded. Please check server logs."
        )
    
    try:
        # Prepare input data as dictionary
        input_dict = {
            "session_id": "API_REQUEST",  # Not used in prediction but required by dataset structure
            "baby_age_months": request.baby_age_months,
            "audio_predicted_class": request.audio_predicted_class,
            "audio_confidence": request.audio_confidence,
            "image_predicted_class": request.image_predicted_class,
            "image_confidence": request.image_confidence,
            "time_since_feed_hours": request.time_since_feed_hours,
            "time_since_sleep_hours": request.time_since_sleep_hours,
            "diaper_status": request.diaper_status,
            "room_temperature_celsius": request.room_temperature_celsius,
            "model_disagreement": request.audio_predicted_class != request.image_predicted_class,
            "ambiguous_case": (request.audio_confidence < 0.7) or (request.image_confidence < 0.7)
        }
        
        # Convert to DataFrame
        sample_df = pd.DataFrame([input_dict])
        
        # Get predictions
        pred_encoded = calibrated_model.predict(sample_df)[0]
        probs = calibrated_model.predict_proba(sample_df)[0]
        
        # Convert back to original labels
        predicted_label = label_encoder.inverse_transform([pred_encoded])[0]
        confidence = float(probs[pred_encoded])
        
        # Create probability dict with original labels
        prob_dict = {
            label: float(probs[i]) 
            for i, label in enumerate(label_encoder.classes_)
        }
        
        # Determine confidence level
        if confidence < 0.60:
            confidence_level = "Low"
            confidence_message = "The model has low confidence. Consider checking multiple factors."
        elif confidence < 0.80:
            confidence_level = "Medium"
            confidence_message = "The model has moderate confidence in this prediction."
        else:
            confidence_level = "High"
            confidence_message = "The model is highly confident in this prediction."
        
        # Generate contextual message
        context_messages = []
        if request.time_since_feed_hours > 3:
            context_messages.append(f"It's been {request.time_since_feed_hours:.1f} hours since last feeding.")
        if request.time_since_sleep_hours > 2:
            context_messages.append(f"Baby hasn't slept for {request.time_since_sleep_hours:.1f} hours.")
        if request.diaper_status != "Clean":
            context_messages.append(f"Diaper is {request.diaper_status.lower()}.")
        if request.room_temperature_celsius < 20 or request.room_temperature_celsius > 28:
            context_messages.append(f"Room temperature is {request.room_temperature_celsius}°C (may be uncomfortable).")
        
        context_info = " ".join(context_messages) if context_messages else "All contextual factors appear normal."
        
        return {
            "predicted_cry_reason": predicted_label,
            "confidence": confidence,
            "confidence_level": confidence_level,
            "confidence_message": confidence_message,
            "context_info": context_info,
            "all_class_probabilities": prob_dict,
            "input_summary": {
                "audio_prediction": f"{request.audio_predicted_class} ({request.audio_confidence:.0%})",
                "image_prediction": f"{request.image_predicted_class} ({request.image_confidence:.0%})",
                "baby_age": f"{request.baby_age_months} months"
            },
            "disclaimer": "This is an AI-based suggestion, not medical advice. Always consult healthcare professionals for concerns."
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(e)}"
        )

# ==============================
# HEALTH CHECK ENDPOINT
# ==============================
@router.get("/health")
async def health_check():
    """Check if the fusion model is loaded and ready"""
    return {
        "status": "healthy" if (calibrated_model is not None and label_encoder is not None) else "unhealthy",
        "model_loaded": calibrated_model is not None,
        "encoder_loaded": label_encoder is not None,
        "available_classes": list(label_encoder.classes_) if label_encoder is not None else []
    }
