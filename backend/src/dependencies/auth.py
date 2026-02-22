import os
import secrets

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
from firebase_admin.auth import InvalidIdTokenError
from sqlalchemy.orm import Session
from src.database import get_db
from src.services import user_service

DEV_USER_ID = os.getenv("DEV_USER_ID")
APP_ENV = os.getenv("APP_ENV", "PROD") 
IS_DEV_ENV = (APP_ENV == "DEV")

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    id_token = credentials.credentials
    
    uid = None
    email = None
    
    if IS_DEV_ENV and DEV_USER_ID and secrets.compare_digest(id_token, DEV_USER_ID):
        uid = DEV_USER_ID
        email = "dev@local.host"
    else:
        try:
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token["uid"]
            email = decoded_token.get("email")
        except InvalidIdTokenError:
            raise HTTPException(status_code=401, detail="Invalid ID token")
        except Exception:
            raise HTTPException(status_code=500, detail="Auth verification failed")
        
    user = user_service.UserService.get_or_create_user(db, uid, email)
    
    return user
