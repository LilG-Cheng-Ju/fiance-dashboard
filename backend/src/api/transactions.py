from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src import database
from src import schemas
from src.services import transaction_service
from src.dependencies.auth import get_current_user

router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)

@router.post("", response_model=schemas.TransactionResponse)
def create_transaction(
    tx_in: schemas.TransactionCreate,
    db: Session = Depends(database.get_db),
    current_user: str = Depends(get_current_user),
):
    return transaction_service.TransactionService.create(db, tx_in, current_user)

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(database.get_db),
    current_user: str = Depends(get_current_user),
):
    return transaction_service.TransactionService.delete(
        db, transaction_id, current_user
    )
