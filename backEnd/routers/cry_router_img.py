from fastapi import APIRouter, File, UploadFile, HTTPException
import numpy as np
import cv2
import io
import os
import joblib

# MediaPipe for facial landmark detection
try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    MEDIAPIPE_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ [FaceRouter] MediaPipe not available: {e}")
    MEDIAPIPE_AVAILABLE = False

router = APIRouter()

# --- 1. SETUP PATHS ---
current_dir = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(current_dir, '..', '..', 'mlModels', 'CryTranslater', 'saved_models', 'img_rf_pain_classifier3.pkl')
LANDMARKER_PATH = os.path.join(current_dir, '..', '..', 'mlModels', 'CryTranslater', 'Notebooks', 'face_landmarker.task')

print(f"🔍 [FaceRouter] Looking for model at: {os.path.abspath(MODEL_PATH)}")
print(f"🔍 [FaceRouter] Looking for landmarker at: {os.path.abspath(LANDMARKER_PATH)}")

# --- 2. LOAD RANDOM FOREST MODEL ---
face_model = None
face_detector = None

# Landmark indices for feature extraction
LEFT_EYE = [159, 145, 133, 33]
RIGHT_EYE = [386, 374, 362, 263]
MOUTH = [13, 14, 61, 291]
LEFT_BROW_INNER = 55
LEFT_EYE_INNER = 133
RIGHT_BROW_INNER = 285
RIGHT_EYE_INNER = 362

def load_face_model():
    global face_model, face_detector
    try:
        # Load Random Forest model
        if not os.path.exists(MODEL_PATH):
            print(f"⚠️ [FaceRouter] Model file NOT found at: {MODEL_PATH}")
            return

        face_model = joblib.load(MODEL_PATH)
        print("✅ [FaceRouter] Random Forest model loaded successfully!")
        
        # Initialize MediaPipe Face Landmarker
        if MEDIAPIPE_AVAILABLE:
            if not os.path.exists(LANDMARKER_PATH):
                print(f"⚠️ [FaceRouter] Downloading face_landmarker.task...")
                import urllib.request
                url = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
                os.makedirs(os.path.dirname(LANDMARKER_PATH), exist_ok=True)
                urllib.request.urlretrieve(url, LANDMARKER_PATH)
                print("✅ [FaceRouter] Landmarker downloaded!")
            
            base_options = python.BaseOptions(model_asset_path=LANDMARKER_PATH)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False,
                num_faces=1,
                min_face_detection_confidence=0.5
            )
            face_detector = vision.FaceLandmarker.create_from_options(options)
            print("✅ [FaceRouter] MediaPipe Face Detector initialized!")
        
    except Exception as e:
        print(f"❌ [FaceRouter] Error loading model: {e}")
        face_model = None
        face_detector = None

# Load immediately on startup
load_face_model()

# --- 3. FEATURE EXTRACTION FUNCTIONS ---
def calculate_ratio(landmarks, indices):
    """Calculates Aspect Ratio: Vertical Dist / Horizontal Dist"""
    top = np.array([landmarks[indices[0]].x, landmarks[indices[0]].y])
    bottom = np.array([landmarks[indices[1]].x, landmarks[indices[1]].y])
    left = np.array([landmarks[indices[2]].x, landmarks[indices[2]].y])
    right = np.array([landmarks[indices[3]].x, landmarks[indices[3]].y])
    
    vertical_dist = np.linalg.norm(top - bottom)
    horizontal_dist = np.linalg.norm(left - right)
    
    if horizontal_dist == 0:
        return 0.0
    return vertical_dist / horizontal_dist

def calculate_brow_score(landmarks):
    """Calculates normalized brow distance. Lower = Pain/Frowning"""
    l_brow = np.array([landmarks[LEFT_BROW_INNER].x, landmarks[LEFT_BROW_INNER].y])
    l_eye = np.array([landmarks[LEFT_EYE_INNER].x, landmarks[LEFT_EYE_INNER].y])
    r_brow = np.array([landmarks[RIGHT_BROW_INNER].x, landmarks[RIGHT_BROW_INNER].y])
    r_eye = np.array([landmarks[RIGHT_EYE_INNER].x, landmarks[RIGHT_EYE_INNER].y])
    
    l_dist = np.linalg.norm(l_brow - l_eye)
    r_dist = np.linalg.norm(r_brow - r_eye)
    
    # Normalize by inter-ocular distance
    eye_span = np.linalg.norm(
        np.array([landmarks[33].x, landmarks[33].y]) - 
        np.array([landmarks[263].x, landmarks[263].y])
    )
    
    if eye_span == 0:
        return 0
    return (l_dist + r_dist) / (2 * eye_span)

def extract_features(image_bytes):
    """Extract facial biomarkers (EAR, MAR, Brow Score) from image"""
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return None
        
        # Convert to RGB for MediaPipe
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        
        # Detect face landmarks
        detection_result = face_detector.detect(mp_image)
        
        if not detection_result.face_landmarks:
            return None
        
        lm = detection_result.face_landmarks[0]
        
        # Extract features
        left_ear = calculate_ratio(lm, LEFT_EYE)
        right_ear = calculate_ratio(lm, RIGHT_EYE)
        avg_ear = (left_ear + right_ear) / 2.0
        
        mar = calculate_ratio(lm, MOUTH)
        brow_score = calculate_brow_score(lm)
        
        # Return features in correct order: ear, mar, brow_score
        return np.array([[avg_ear, mar, brow_score]])
        
    except Exception as e:
        print(f"Feature extraction error: {e}")
        return None

# --- 4. PREDICTION ROUTE ---
@router.post("/predict-face")
async def predict_face(file: UploadFile = File(...)):
    if face_model is None or face_detector is None:
        load_face_model()
        if face_model is None:
            raise HTTPException(status_code=503, detail="Face model could not be loaded.")
        if face_detector is None:
            raise HTTPException(status_code=503, detail="Face detector could not be initialized.")

    try:
        # Read file
        contents = await file.read()
        
        # Extract features using MediaPipe
        features = extract_features(contents)
        if features is None:
            raise HTTPException(status_code=400, detail="Could not detect face or extract features from image")

        # Predict using Random Forest
        prediction = face_model.predict(features)[0]
        probabilities = face_model.predict_proba(features)[0]
        
        # prediction: 0 = No Pain, 1 = Pain
        # probabilities is array like [0.3, 0.7] for [No Pain prob, Pain prob]
        no_pain_prob = float(probabilities[0])
        pain_prob = float(probabilities[1])
        
        if prediction == 1:
            label = "pain_expression"
            confidence = pain_prob
            msg = "Detected: Painful Expression 😣"
        else:
            label = "no_pain"
            confidence = no_pain_prob
            msg = "Detected: No Pain / Neutral 🙂"

        return {
            "label": label,
            "confidence": round(confidence * 100, 2),
            "pain_probability": round(pain_prob * 100, 2),
            "features": {
                "ear": round(float(features[0][0]), 4),
                "mar": round(float(features[0][1]), 4),
                "brow_score": round(float(features[0][2]), 4)
            },
            "message": msg
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"🔥 Prediction Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))