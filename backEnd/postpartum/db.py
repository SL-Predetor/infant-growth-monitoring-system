import os
from pathlib import Path
from typing import Optional

from pymongo import MongoClient
from pymongo.collection import Collection

# Load environment variables from .env (try both current dir and parent dir)
try:
    from dotenv import load_dotenv
    
    # Try loading from current directory first
    env_path = Path(__file__).parent.parent / ".env"  # Go up one level to backEnd/
    if env_path.exists():
        print(f"📂 Loading .env from: {env_path}")
        load_dotenv(env_path)
    else:
        # Try current directory
        print("📂 Loading .env from current directory")
        load_dotenv()
except ImportError:
    print("⚠️  python-dotenv not installed, skipping .env loading")


POSTPARTUM_MONGODB_URI = os.getenv("POSTPARTUM_MONGODB_URI") or os.getenv("MONGODB_URI")
POSTPARTUM_DB_NAME = os.getenv("POSTPARTUM_DB_NAME", "TinySteps_db")
POSTPARTUM_COLLECTION_NAME = os.getenv("POSTPARTUM_COLLECTION_NAME", "postpartum")

# Debug: Print loaded configuration
print("\n" + "="*60)
print("📦 POSTPARTUM MODULE CONFIGURATION")
print("="*60)
print(f"✓ POSTPARTUM_DB_NAME: {POSTPARTUM_DB_NAME}")
print(f"✓ POSTPARTUM_COLLECTION_NAME: {POSTPARTUM_COLLECTION_NAME}")
print(f"✓ POSTPARTUM_MONGODB_URI: {'SET' if POSTPARTUM_MONGODB_URI else 'NOT SET'}")
if POSTPARTUM_MONGODB_URI:
    # Show first 50 chars and last 20 chars for security
    uri_preview = POSTPARTUM_MONGODB_URI[:50] + "..." + POSTPARTUM_MONGODB_URI[-20:]
    print(f"  URI preview: {uri_preview}")
print("="*60 + "\n")

_client: Optional[MongoClient] = None


def get_postpartum_collection() -> Optional[Collection]:
    global _client

    if not POSTPARTUM_MONGODB_URI:
        print("❌ MongoDB URI not set. Check .env file.")
        return None

    if _client is None:
        try:
            print("🔌 Attempting MongoDB connection...")
            _client = MongoClient(POSTPARTUM_MONGODB_URI, serverSelectionTimeoutMS=5000)
            # Try to connect immediately to catch errors early
            _client.admin.command('ping')
            print("✅ MongoDB connected successfully!")
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
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
        print(f"⚠️  MongoDB ping failed: {e}")
        return False
