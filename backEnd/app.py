from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

# --- 1. SETUP FFMPEG (Crucial for Windows) ---
# Adds the current folder to the system path so Python can find ffmpeg.exe
os.environ["PATH"] += os.pathsep + os.path.dirname(os.path.abspath(__file__))

# --- 2. IMPORT ROUTERS ---
# Gradually re-enabling routers for Azure deployment
# from routers import cry_router_audio  # DISABLED - requires librosa (heavy)
# from routers import cry_router_img    # DISABLED - requires opencv/mediapipe (heavy)
from routers import cry_router_fusion   # ENABLED - light dependencies (pandas/joblib)

app = FastAPI(title="Infant Growth Monitoring System API")

# --- 3. CORS SETUP (Allows Phone/Web to connect) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. INCLUDE THE ROUTERS ---
# Gradually re-enabling routers for Azure deployment
# app.include_router(cry_router_audio.router, tags=["Cry Analysis (Audio)"])  # DISABLED
# app.include_router(cry_router_img.router, tags=["Face Analysis (Image)"])    # DISABLED
app.include_router(cry_router_fusion.router, tags=["Fusion Analysis"], prefix="/fusion")  # ENABLED

@app.get("/")
def home():
    return {
        "status": "online", 
        "message": "✅ Azure deployment successful! FastAPI server with Fusion Analysis enabled.",
        "info": "Fusion ML features are now active. Audio/Image analysis still disabled for Azure optimization.",
        "endpoints": ["/docs", "/redoc", "/fusion/health", "/fusion/predict"],
        "enabled_features": ["Fusion Analysis"],
        "disabled_features": ["Audio Analysis", "Image Analysis"],
        "note": "Gradual re-enablement of ML features for Azure free tier compatibility"
    }

if __name__ == "__main__":
    # Host 0.0.0.0 is required for mobile phones to connect
    uvicorn.run(app, host="0.0.0.0", port=8000)