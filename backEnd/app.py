from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

# --- CRITICAL FIX FOR WINDOWS FFMPEG ---
# We keep this in the main app so it runs immediately
os.environ["PATH"] += os.pathsep + os.path.dirname(os.path.abspath(__file__))

# Import your new router
from routers import cry_router

app = FastAPI(title="Baby Cry Translator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect the Cry Router to the App
# This adds all the routes from cry_router.py to the main app
app.include_router(cry_router.router, tags=["Cry Translator"])

@app.get("/")
def home():
    return {"status": "running", "message": "Main Mall Entrance"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)