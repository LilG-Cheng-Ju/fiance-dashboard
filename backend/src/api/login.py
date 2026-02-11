from fastapi import Depends, HTTPException, APIRouter
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth

router = APIRouter(prefix="/login", tags=["login"])

security = HTTPBearer()

# 回傳使用者UID
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    id_token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid ID token")

@router.get("/me")
def read_me(uid: str = Depends(get_current_user)):
    return {"uid": uid}