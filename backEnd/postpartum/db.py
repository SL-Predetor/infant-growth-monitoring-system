import os
from pathlib import Path
from typing import Optional
import time

from pymongo import MongoClient
from pymongo.collection import Collection

# Load environment variables from .env (try both current dir and parent dir)
try:
    from dotenv import load_dotenv
    
    # Try loading from current directory first
    env_path = Path(__file__).parent.parent / ".env"  # Go up one level to backEnd/
    if env_path.exists():
        print(f"[INFO] Loading .env from: {env_path}")
        load_dotenv(env_path)
    else:
        # Try current directory
        print("[INFO] Loading .env from current directory")
        load_dotenv()
except ImportError:
    print("[WARNING] python-dotenv not installed, skipping .env loading")


POSTPARTUM_MONGODB_URI = os.getenv("POSTPARTUM_MONGODB_URI") or os.getenv("MONGODB_URI")
POSTPARTUM_DB_NAME = os.getenv("POSTPARTUM_DB_NAME", "TinySteps_db")
POSTPARTUM_COLLECTION_NAME = os.getenv("POSTPARTUM_COLLECTION_NAME", "postpartum")

# Debug: Print loaded configuration
print("\n" + "="*60)
print("[INFO] POSTPARTUM MODULE CONFIGURATION")
print("="*60)
print(f"[OK] POSTPARTUM_DB_NAME: {POSTPARTUM_DB_NAME}")
print(f"[OK] POSTPARTUM_COLLECTION_NAME: {POSTPARTUM_COLLECTION_NAME}")
print(f"[OK] POSTPARTUM_MONGODB_URI: {'SET' if POSTPARTUM_MONGODB_URI else 'NOT SET'}")
if POSTPARTUM_MONGODB_URI:
    # Show first 50 chars and last 20 chars for security
    uri_preview = POSTPARTUM_MONGODB_URI[:50] + "..." + POSTPARTUM_MONGODB_URI[-20:]
    print(f"  URI preview: {uri_preview}")
print("="*60 + "\n")

_client: Optional[MongoClient] = None
_last_connection_attempt: float = 0
_connection_cooldown_seconds: float = 30  # Don't retry connection for 30 seconds after failure


def get_postpartum_collection() -> Optional[Collection]:
    global _client, _last_connection_attempt

    if not POSTPARTUM_MONGODB_URI:
        return None

    if _client is None:
        now = time.time()
        # Check if we should attempt connection (cooldown period)
        if now - _last_connection_attempt < _connection_cooldown_seconds:
            # Still in cooldown, return None without retrying
            return None
        
        _last_connection_attempt = now
        try:
            _client = MongoClient(POSTPARTUM_MONGODB_URI, serverSelectionTimeoutMS=3000, connectTimeoutMS=3000)
            # Try to connect immediately to catch errors early
            _client.admin.command('ping')
            print("[OK] MongoDB connected successfully!")
        except Exception as e:
            print(f"[WARNING] MongoDB unavailable: {type(e).__name__}")
            _client = None
            return None

    return _client[POSTPARTUM_DB_NAME][POSTPARTUM_COLLECTION_NAME]


def is_postpartum_db_connected() -> bool:
    collection = get_postpartum_collection()
    if collection is None:
        return False

    try:
        collection.database.client.admin.command("ping")
        return True
    except Exception as e:
        print(f"[WARNING] MongoDB ping failed: {e}")
        return False
