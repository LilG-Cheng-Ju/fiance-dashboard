from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src import database
from src import schemas
from src.services import transaction_service

router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)

@router.post("/", response_model=schemas.TransactionResponse)
def create_transaction(
    tx_in: schemas.TransactionCreate, 
    db: Session = Depends(database.get_db)
):
    return transaction_service.TransactionService.create(db, tx_in)

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int, 
    db: Session = Depends(database.get_db)
):
    return transaction_service.TransactionService.delete(db, transaction_id)