from pathlib import Path
import firebase_admin
from firebase_admin import credentials

def init_app():
    if firebase_admin._apps:
        return

    BASE_DIR = Path(__file__).resolve().parents[2]
    cred_path = BASE_DIR / "config" / "firebase-service-account.json"

    if cred_path.exists():
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print(f"✅ Firebase Admin initialized with: {cred_path.name}")
    else:
        print("⚠️ Firebase key not found, attempting default credentials (ADC)...")
        firebase_admin.initialize_app()