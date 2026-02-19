from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from src import database, schemas
from src.services import asset_service, transaction_service
from src.dependencies.auth import get_current_user

router = APIRouter(
    prefix="/assets",
    tags=["Assets"]
)

@router.get("/", response_model=List[schemas.AssetResponse])
def read_assets(
    db: Session = Depends(database.get_db),
    current_user: str = Depends(get_current_user),
):
    return asset_service.AssetService.get_assets(db, current_user)

@router.post("/", response_model=schemas.AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    asset_in: schemas.AssetCreate,
    db: Session = Depends(database.get_db),
    current_user: str = Depends(get_current_user),
):
    return asset_service.AssetService.create_asset(db, asset_in, current_user)

@router.patch("/{asset_id}", response_model=schemas.AssetResponse)
def update_asset(
    asset_id: int,
    asset_update: schemas.AssetUpdate,
    db: Session = Depends(database.get_db),
    current_user: str = Depends(get_current_user),
):
    return asset_service.AssetService.update_asset(db, asset_id, asset_update, current_user)

@router.delete("/{asset_id}")
def delete_asset(
    asset_id: int,
    db: Session = Depends(database.get_db),
    current_user: str = Depends(get_current_user),
):
    asset_service.AssetService.delete_asset(db, asset_id, current_user)
    return {"message": "Asset and associated transactions deleted"}

@router.get("/{asset_id}/transactions", response_model=List[schemas.TransactionResponse])
def read_asset_transactions(
    asset_id: int,
    limit: int = 20,
    db: Session = Depends(database.get_db),
    current_user: str = Depends(get_current_user),
):
    # Delegate to TransactionService because it handles transaction logic
    return transaction_service.TransactionService.get_by_asset_id(db, asset_id, current_user, limit)
