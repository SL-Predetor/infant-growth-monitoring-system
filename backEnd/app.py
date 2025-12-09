import pickle
import numpy as np
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import warnings

warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)

# Load the model
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'mlModels', 'CryTranslater', 'audio_pain_model1.pkl')

try:
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    print("[OK] Model loaded successfully from " + MODEL_PATH)
except Exception as e:
    print("[ERROR] Error loading model: " + str(e))
    model = None

# Map class predictions to labels
LABEL_MAP = {
    0: 'hunger_cry',
    1: 'pain_cry',
    2: 'normal_cry'
}

def extract_features_simple(audio_path):
    """Extract simple features from audio file using numpy only"""
    try:
        import wave
        # Load audio file using built-in wave module
        with wave.open(audio_path, 'rb') as wav_file:
            frames = wav_file.readframes(wav_file.getnframes())
            audio_data = np.frombuffer(frames, dtype=np.int16)
            
            # Extract simple statistical features
            features = np.array([
                np.mean(np.abs(audio_data)),           # Mean amplitude
                np.std(audio_data),                     # Standard deviation
                np.max(np.abs(audio_data)),             # Peak amplitude
                np.mean(np.diff(audio_data) ** 2),      # Energy change
            ])
            
            # Pad to match expected input size (13 features from MFCC)
            features = np.pad(features, (0, 9), mode='constant')
            
            return features.reshape(1, -1)
    except Exception as e:
        print(f"Feature extraction error: {e}")
        return None

@app.route('/predict-cry', methods=['POST'])
def predict_cry():
    """Predict cry type from audio file"""
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        # Get audio file from request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        audio_file = request.files['file']
        
        # Save temporarily
        temp_path = os.path.join(os.path.dirname(__file__), 'temp_cry.wav')
        audio_file.save(temp_path)
        
        # Extract features
        features = extract_features_simple(temp_path)
        
        if features is None:
            return jsonify({'error': 'Failed to extract features'}), 400
        
        # Predict
        prediction = model.predict(features)[0]
        confidence = model.predict_proba(features)[0].max()
        
        # Map to label
        label = LABEL_MAP.get(prediction, 'normal_cry')
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify({
            'label': label,
            'confidence': float(confidence),
            'prediction': int(prediction)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'model_loaded': model is not None})

if __name__ == '__main__':
    print("[START] Starting Cry Translator API server...")
    print("[INFO] Server running at http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
