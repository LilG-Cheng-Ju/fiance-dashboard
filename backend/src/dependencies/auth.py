# src/core/auth.py

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth
from firebase_admin.auth import InvalidIdTokenError

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    id_token = credentials.credentials

    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token["uid"]
    except InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid ID token")
    except Exception:
        raise HTTPException(status_code=500, detail="Auth verification failed")
