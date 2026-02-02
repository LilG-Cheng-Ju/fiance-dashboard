from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from src import database, schemas
from src.services import asset_service, transaction_service

router = APIRouter(
    prefix="/assets",
    tags=["Assets"]
)

@router.get("/", response_model=List[schemas.AssetResponse])
def read_assets(db: Session = Depends(database.get_db)):
    return asset_service.AssetService.get_assets(db)

@router.post("/", response_model=schemas.AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    asset_in: schemas.AssetCreate, 
    db: Session = Depends(database.get_db)
):
    return asset_service.AssetService.create_asset(db, asset_in)

@router.delete("/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(database.get_db)):
    asset_service.AssetService.delete_asset(db, asset_id)
    return {"message": "Asset and associated transactions deleted"}

@router.get("/{asset_id}/transactions", response_model=List[schemas.TransactionResponse])
def read_asset_transactions(
    asset_id: int, 
    limit: int = 20, 
    db: Session = Depends(database.get_db)
):
    # Delegate to TransactionService because it handles transaction logic
    return transaction_service.TransactionService.get_by_asset_id(db, asset_id, limit)