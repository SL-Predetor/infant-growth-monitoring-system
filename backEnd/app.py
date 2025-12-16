from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

# --- 1. SETUP FFMPEG (Crucial for Windows) ---
# Adds the current folder to the system path so Python can find ffmpeg.exe
os.environ["PATH"] += os.pathsep + os.path.dirname(os.path.abspath(__file__))

# --- 2. IMPORT ROUTERS ---
# We import the file from the 'routers' folder
from routers import cry_router

app = FastAPI(title="Infant Growth Monitoring System API")

# --- 3. CORS SETUP (Allows Phone/Web to connect) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. INCLUDE THE ROUTER ---
# This connects the "Cry Shop" to the main app
app.include_router(cry_router.router, tags=["Cry Translator"])

@app.get("/")
def home():
    return {"status": "online", "message": "Backend is running correctly"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)