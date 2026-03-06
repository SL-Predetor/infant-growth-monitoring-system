from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn
import os
from dotenv import load_dotenv

# --- 0. LOAD ENVIRONMENT VARIABLES ---
# Load .env file from current directory
load_dotenv()
print("[INFO] Environment variables loaded from .env file")

# Load environment variables from .env file
load_dotenv()

# --- 1. SETUP FFMPEG (Crucial for Windows) ---
# Adds the current folder to the system path so Python can find ffmpeg.exe
os.environ["PATH"] += os.pathsep + os.path.dirname(os.path.abspath(__file__))

import shutil
_ffmpeg_path = shutil.which("ffmpeg")
if _ffmpeg_path:
    print(f"[INFO] ffmpeg found: {_ffmpeg_path}")
else:
    print("[WARNING] ffmpeg NOT found on PATH! Audio analysis of webm/ogg files will fail.")
    print("[WARNING] Install ffmpeg: https://ffmpeg.org/download.html  (and restart the server)")

# --- 2. IMPORT ROUTERS ---
# We import the routers from the 'routers' folder
# Make sure the filenames in your 'routers' folder match these exactly!
from routers import cry_router_audio  # Your Audio Logic
from routers import cry_router_img    # Your New Face Logic
from routers import cry_router_fusion # Fusion Analysis Logic
from routers.growth_router import router as growth_router
from postpartum import router as postpartum_router


# postpartum module 
from postpartum import router as postpartum_router

app = FastAPI(title="Infant Growth Monitoring System API")

# --- 3. CORS SETUP (Allows Phone/Web to connect) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8082",
        "http://localhost:8081",
        "http://localhost:3000",
        "http://localhost:19006",
        "http://127.0.0.1:8082",
        "*" # Keeping "*" as requested to not remove existing allowed origins if any, though user asked to add these if not there. 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. INCLUDE THE ROUTERS ---
# Connect both "Shops" (Audio and Face) to the main App Mall
app.include_router(cry_router_audio.router, tags=["Cry Analysis (Audio)"])
app.include_router(cry_router_img.router, tags=["Face Analysis (Image)"])
app.include_router(cry_router_fusion.router, tags=["Fusion Analysis"], prefix="/fusion")
app.include_router(growth_router, prefix="/api", tags=["Growth"])
app.include_router(postpartum_router)


# include postpartum endpoints
app.include_router(postpartum_router)  # mounted at /postpartum

@app.get("/")
def home():
    return {"status": "online", "message": "Backend is running correctly (Audio + Face)"}

if __name__ == "__main__":
    # Host 0.0.0.0 is required for mobile phones to connect
    uvicorn.run(app, host="0.0.0.0", port=8000)