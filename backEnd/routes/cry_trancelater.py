# import os
# import shutil
# import uuid
# from flask import Blueprint, request, jsonify
# import pickle
# import numpy as np
# import torch
# import torch.nn as nn
# import timm
# from PIL import Image
# from torchvision import transforms

# router = Blueprint('cry_translator', __name__)

# # Load audio model globally
# MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'mlModels', 'CryTranslater', 'audio_pain_model1.pkl')

# try:
#     with open(MODEL_PATH, 'rb') as f:
#         model = pickle.load(f)
#     print("[OK] Audio model loaded in router")
# except Exception as e:
#     print("[ERROR] Audio model load error in router: " + str(e))
#     model = None

# # Load image model globally
# IMG_MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'mlModels', 'CryTranslater', 'Notebooks', 'pain_model_best.pth')
# device = "cuda" if torch.cuda.is_available() else "cpu"
# image_model = None

# try:
#     # Create model architecture
#     image_model = timm.create_model("efficientnet_b2", pretrained=True)
#     image_model.classifier = nn.Sequential(
#         nn.Dropout(0.3),
#         nn.Linear(image_model.classifier.in_features, 256),
#         nn.ReLU(),
#         nn.Dropout(0.2),
#         nn.Linear(256, 1)
#     )
    
#     # Load weights
#     image_model.load_state_dict(torch.load(IMG_MODEL_PATH, map_location=device))
#     image_model = image_model.to(device)
#     image_model.eval()
#     print("[OK] Image model loaded in router")
# except Exception as e:
#     print("[WARNING] Image model load error: " + str(e))
#     image_model = None

# # Valid pain steps for snapping predictions
# VALID_PAIN_STEPS = np.array([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 8])

# # ImageNet normalization
# IMAGENET_MEAN = [0.485, 0.456, 0.406]
# IMAGENET_STD = [0.229, 0.224, 0.225]

# # Label mapping
# LABEL_MAP = {
#     0: 'hunger_cry',
#     1: 'pain_cry',
#     2: 'normal_cry'
# }

# def snap_predictions(predictions, valid_steps):
#     """Snap continuous predictions to nearest valid discrete step."""
#     predictions = np.asarray(predictions).flatten()
#     valid_steps = np.asarray(valid_steps)
#     distances = np.abs(predictions[:, np.newaxis] - valid_steps[np.newaxis, :])
#     closest_indices = np.argmin(distances, axis=1)
#     snapped = valid_steps[closest_indices]
#     return snapped

# def predict_pain_from_image(image_path: str):
#     """Predict pain level from image using deep learning model."""
#     if image_model is None:
#         return None, 0.0, None
    
#     try:
#         img = Image.open(image_path).convert("RGB")
#         transform = transforms.Compose([
#             transforms.Resize((224, 224)),
#             transforms.ToTensor(),
#             transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
#         ])
        
#         img_tensor = transform(img).unsqueeze(0).to(device)
#         with torch.no_grad():
#             raw_pred = image_model(img_tensor).item()
        
#         raw_pred = np.clip(raw_pred, 0, 8)
#         snapped_pred = snap_predictions([raw_pred], VALID_PAIN_STEPS)[0]
#         confidence = 1.0 - (abs(raw_pred - snapped_pred) / 0.5)
#         confidence = np.clip(confidence, 0, 1)
        
#         return float(snapped_pred), float(confidence), float(raw_pred)
#     except Exception as e:
#         print("[ERROR] Image prediction error: " + str(e))
#         return None, 0.0, None

# def extract_features_simple(audio_path: str):
#     """Extract simple features from audio file using wave module"""
#     try:
#         import wave
#         with wave.open(audio_path, 'rb') as wav_file:
#             frames = wav_file.readframes(wav_file.getnframes())
#             audio_data = np.frombuffer(frames, dtype=np.int16)
            
#             features = np.array([
#                 np.mean(np.abs(audio_data)),
#                 np.std(audio_data),
#                 np.max(np.abs(audio_data)),
#                 np.mean(np.diff(audio_data) ** 2),
#             ])
            
#             features = np.pad(features, (0, 9), mode='constant')
#             return features.reshape(1, -1)
#     except Exception as e:
#         print("[ERROR] Feature extraction error: " + str(e))
#         return None

# def predict(audio_path: str, image_path: str = None):
#     """Run model prediction on audio file"""
#     if model is None:
#         return 'error', 0.0
    
#     try:
#         features = extract_features_simple(audio_path)
#         if features is None:
#             return 'error', 0.0
        
#         prediction = model.predict(features)[0]
#         confidence = model.predict_proba(features)[0].max()
#         label = LABEL_MAP.get(prediction, 'normal_cry')
        
#         return label, float(confidence)
#     except Exception as e:
#         print("[ERROR] Prediction error: " + str(e))
#         return 'error', 0.0

# @router.route('/predict-cry', methods=['POST'])
# def predict_cry():
#     """Predict cry type from audio and optional image"""
#     try:
#         os.makedirs("tmp", exist_ok=True)
        
#         if 'file' not in request.files:
#             return jsonify({'error': 'No audio file provided'}), 400
        
#         audio_file = request.files['file']
#         audio_ext = audio_file.filename.split('.')[-1] if '.' in audio_file.filename else 'wav'
#         audio_name = f"{uuid.uuid4()}.{audio_ext}"
#         audio_path = os.path.join("tmp", audio_name)
        
#         with open(audio_path, "wb") as f:
#             audio_file.save(f)
        
#         image_path = None
#         if 'image' in request.files and request.files['image'].filename:
#             image_file = request.files['image']
#             image_ext = image_file.filename.split('.')[-1] if '.' in image_file.filename else 'jpg'
#             image_name = f"{uuid.uuid4()}.{image_ext}"
#             image_path = os.path.join("tmp", image_name)
            
#             with open(image_path, "wb") as f:
#                 image_file.save(f)
        
#         label, confidence = predict(audio_path, image_path)
        
#         if os.path.exists(audio_path):
#             os.remove(audio_path)
#         if image_path and os.path.exists(image_path):
#             os.remove(image_path)
        
#         return jsonify({
#             'label': label,
#             'confidence': confidence,
#             'prediction': LABEL_MAP.get(label, 2)
#         })
    
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500

# @router.route('/predict-pain', methods=['POST'])
# def predict_pain():
#     """Predict pain level from image"""
#     try:
#         if 'image' not in request.files:
#             return jsonify({'error': 'No image file provided'}), 400
        
#         if image_model is None:
#             return jsonify({'error': 'Image model not loaded'}), 503
        
#         image_file = request.files['image']
        
#         if image_file.filename == '':
#             return jsonify({'error': 'No image file selected'}), 400
        
#         os.makedirs("tmp", exist_ok=True)
        
#         image_ext = image_file.filename.split('.')[-1] if '.' in image_file.filename else 'jpg'
#         image_name = f"{uuid.uuid4()}.{image_ext}"
#         image_path = os.path.join("tmp", image_name)
        
#         with open(image_path, "wb") as f:
#             image_file.save(f)
        
#         pain_level, confidence, raw_pred = predict_pain_from_image(image_path)
        
#         if os.path.exists(image_path):
#             os.remove(image_path)
        
#         if pain_level is None:
#             return jsonify({'error': 'Prediction failed'}), 500
        
#         return jsonify({
#             'pain_level': pain_level,
#             'confidence': confidence,
#             'raw_prediction': raw_pred,
#             'interpretation': f"Pain level: {pain_level}/8"
#         })
    
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500

# @router.route('/health', methods=['GET'])
# def health():
#     """Health check endpoint"""
#     return jsonify({
#         'status': 'ok', 
#         'audio_model_loaded': model is not None,
#         'image_model_loaded': image_model is not None
#     })
