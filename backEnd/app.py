from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn
import os

# Load environment variables from .env file
load_dotenv()

# --- 1. SETUP FFMPEG (Crucial for Windows) ---
# Adds the current folder to the system path so Python can find ffmpeg.exe
os.environ["PATH"] += os.pathsep + os.path.dirname(os.path.abspath(__file__))

# --- 2. IMPORT ROUTERS ---
# ASD router (optional on environments where TensorFlow cannot initialize)
try:
    from routers.asd_router import router as asd_router
    asd_router_error = None
except Exception as exc:
    asd_router = None
    asd_router_error = exc
    print(f"[APP] WARNING: ASD router unavailable at startup: {exc}")

# Teammates' routers
from routers import cry_router_audio
from routers import cry_router_img
try:
    from routers import cry_router_fusion
    cry_router_fusion_error = None
except Exception as exc:
    cry_router_fusion = None
    cry_router_fusion_error = exc
    print(f"[APP] WARNING: Fusion router unavailable at startup: {exc}")

try:
    from routers.growth_router import router as growth_router
    growth_router_error = None
except Exception as exc:
    growth_router = None
    growth_router_error = exc
    print(f"[APP] WARNING: Growth router unavailable at startup: {exc}")

try:
    from postpartum import router as postpartum_router
    postpartum_router_error = None
except Exception as exc:
    postpartum_router = None
    postpartum_router_error = exc
    print(f"[APP] WARNING: Postpartum router unavailable at startup: {exc}")

try:
    from routers.feedback_router import router as feedback_router
    feedback_router_error = None
except Exception as exc:
    feedback_router = None
    feedback_router_error = exc
    print(f"[APP] WARNING: Feedback router unavailable at startup: {exc}")


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
if asd_router is not None:
    app.include_router(asd_router, prefix="/api/asd", tags=["ASD"])

app.include_router(cry_router_audio.router, tags=["Cry Analysis (Audio)"])
app.include_router(cry_router_img.router, tags=["Face Analysis (Image)"])
if cry_router_fusion is not None:
    app.include_router(cry_router_fusion.router, tags=["Fusion Analysis"], prefix="/fusion")
if growth_router is not None:
    app.include_router(growth_router, prefix="/api", tags=["Growth"])
if postpartum_router is not None:
    app.include_router(postpartum_router)
if feedback_router is not None:
    app.include_router(feedback_router, tags=["Feedback"])


@app.get("/")
def home():
    return {
        "status": "online",
        "message": "Backend is running correctly (Audio + Face)",
        "asd_router_loaded": asd_router is not None,
        "fusion_router_loaded": cry_router_fusion is not None,
        "growth_router_loaded": growth_router is not None,
        "postpartum_router_loaded": postpartum_router is not None,
        "feedback_router_loaded": feedback_router is not None,
    }

if __name__ == "__main__":
    # Host 0.0.0.0 is required for mobile phones to connect
    uvicorn.run(app, host="0.0.0.0", port=8000)