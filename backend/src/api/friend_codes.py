from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src import database, models, schemas
from src.dependencies.auth import get_current_user
from src.services.friend_code_service import FriendCodeService

# Router for general users (e.g., redeeming a code)
router = APIRouter(prefix="/friend-codes", tags=["Friend Codes"])

# Router for admin-specific actions
admin_router = APIRouter(prefix="/admin/friend-codes", tags=["Admin: Friend Codes"])


@router.post("/redeem", response_model=schemas.UserRead)
def redeem_friend_code(
    payload: schemas.FriendCodeRedeem,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Redeems a friend code to upgrade user role to FRIEND."""
    updated_user = FriendCodeService.redeem_code(db, current_user, payload.code)
    return updated_user


@admin_router.get("", response_model=List[schemas.FriendCodeRead])
def get_all_friend_codes(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """[Admin] Get a list of all generated friend codes."""
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.OWNER]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
    
    return FriendCodeService.get_all_codes(db)


@admin_router.post("", response_model=List[schemas.FriendCodeRead], status_code=status.HTTP_201_CREATED)
def create_new_friend_codes(
    payload: schemas.FriendCodeCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user),
):
    """[Admin] Generate a new batch of friend codes."""
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.OWNER]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
        
    return FriendCodeService.create_friend_codes(db, payload.count)