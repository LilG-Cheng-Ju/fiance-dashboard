import os
import secrets

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
from firebase_admin.auth import InvalidIdTokenError

DEV_USER_ID = os.getenv("DEV_USER_ID")
APP_ENV = os.getenv("APP_ENV", "PROD") 
IS_DEV_ENV = (APP_ENV == "DEV")

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    id_token = credentials.credentials
    
    print(IS_DEV_ENV, DEV_USER_ID, id_token)  # Debug print to verify values
    if IS_DEV_ENV and DEV_USER_ID and secrets.compare_digest(id_token, DEV_USER_ID):
        return DEV_USER_ID

    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token["uid"]
    except InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid ID token")
    except Exception:
        raise HTTPException(status_code=500, detail="Auth verification failed")
