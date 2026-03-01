from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

# --- 1. SETUP FFMPEG (Crucial for Windows) ---
# Adds the current folder to the system path so Python can find ffmpeg.exe
os.environ["PATH"] += os.pathsep + os.path.dirname(os.path.abspath(__file__))

# --- 2. IMPORT ROUTERS ---
# We import the routers from the 'routers' folder
# Make sure the filenames in your 'routers' folder match these exactly!
from routers import cry_router_audio  # Your Audio Logic
from routers import cry_router_img    # Your New Face Logic
from routers import cry_router_fusion # Fusion Analysis Logic

# postpartum module 
from postpartum import router as postpartum_router

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
# Connect both "Shops" (Audio and Face) to the main App Mall
app.include_router(cry_router_audio.router, tags=["Cry Analysis (Audio)"])
app.include_router(cry_router_img.router, tags=["Face Analysis (Image)"])
app.include_router(cry_router_fusion.router, tags=["Fusion Analysis"], prefix="/fusion")

# include postpartum endpoints
app.include_router(postpartum_router)  # mounted at /postpartum

@app.get("/")
def home():
    return {"status": "online", "message": "Backend is running correctly (Audio + Face)"}

if __name__ == "__main__":
    # Host 0.0.0.0 is required for mobile phones to connect
    uvicorn.run(app, host="0.0.0.0", port=8000)