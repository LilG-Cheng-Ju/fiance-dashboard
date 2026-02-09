from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, auth


BASE_DIR = Path(__file__).resolve().parents[1]
cred_path = BASE_DIR/"config"/"firebase-service-account.json"
cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)


security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    id_token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid ID token")




# 思考其他API要怎麼帶入這個"uid"資料
# DB欄位設計