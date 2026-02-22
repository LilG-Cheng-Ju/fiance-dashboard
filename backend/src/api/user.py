from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from src import schemas, models, database
from src.dependencies.auth import get_current_user
from src.services import user_service

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.get("/me", response_model=schemas.UserRead)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    """
    Get the current authenticated user's information.
    """
    return current_user

@router.get("", response_model=List[schemas.UserRead])
def read_users(
    skip: int = 0,
    limit: int = 20,
    q: Optional[str] = Query(None, description="Search by email"),
    role: Optional[models.UserRole] = Query(None, description="Filter by user role"),
    sort_by: str = Query("created_at", description="Field to sort by (e.g., created_at, last_login_at)"),
    order: str = Query("desc", regex="^(asc|desc)$", description="Sort order (asc or desc)"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    [Admin Only] Get list of users with pagination, search, filtering, and sorting.
    """
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    return user_service.UserService.get_users(
        db, 
        skip=skip, 
        limit=limit, 
        email_query=q,
        role=role,
        sort_by=sort_by,
        descending=(order == "desc")
    )

@router.patch("/{uid}/role", response_model=schemas.UserRead)
def update_user_role(
    uid: str,
    role_update: schemas.UserRoleUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    [Admin Only] Update a user's role.
    """
    # 1. Check permission
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.OWNER]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # 2. Prevent modifying self role (to avoid locking oneself out)
    if uid == current_user.uid:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    # 3. Perform update
    # We use the generic update_user method we created earlier
    updated_user = user_service.UserService.update_user(db, uid, {"role": role_update.role})
    
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return updated_user

@router.delete("/{uid}", status_code=204)
def delete_user(
    uid: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    [Admin Only] Delete a user and all their data.
    """
    # Check permission
    if current_user.role != models.UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Only OWNER can delete users")
    
    # Prevent self-deletion
    if uid == current_user.uid:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    success = user_service.UserService.delete_user(db, uid)
    
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
