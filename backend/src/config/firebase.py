from pathlib import Path
import firebase_admin
from firebase_admin import credentials

BASE_DIR = Path(__file__).resolve().parents[2]
cred_path = BASE_DIR / "config" / "firebase-service-account.json"

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)