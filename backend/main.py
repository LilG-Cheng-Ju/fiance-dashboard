from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlalchemy.orm import Session

from src import database, models
from src.services import market

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="My Wealth Manager")

# ==========================================
# Pydantic Schemas
# ==========================================

# --- Transaction Schemas ---
class TransactionCreate(BaseModel):
    asset_id: int
    transaction_type: models.TransactionType
    amount: float = Field(..., description="變動金額 (存錢為正，花費為負，買股票為負)")
    quantity_change: float = Field(0.0, description="數量變動 (例如股數)")
    price_at_transaction: Optional[float] = None
    note: Optional[str] = None

class TransactionResponse(BaseModel):
    id: int
    asset_id: int
    transaction_type: models.TransactionType
    amount: float
    quantity_change: float
    balance_after: float
    note: Optional[str]
    transaction_date: datetime

    class Config:
        orm_mode = True

# --- Asset Schemas ---
class AssetCreate(BaseModel):
    name: str
    asset_type: models.AssetType
    currency: str = "TWD"
    initial_balance: float = 0.0 # 初始金額
    initial_quantity: float = 0.0 # 初始數量
    meta_data: Optional[Dict[str, Any]] = {}

class AssetResponse(BaseModel):
    id: int
    name: str
    asset_type: models.AssetType
    currency: str
    current_value: float
    quantity: float
    meta_data: Optional[Dict[str, Any]]

    class Config:
        orm_mode = True
        
class StockPriceResponse(BaseModel):
    ticker: str
    price: float
    currency: str

# ==========================================
# API Endpoints
# ==========================================

@app.get("/assets/", response_model=List[AssetResponse])
def read_assets(db: Session = Depends(database.get_db)):
    assets = db.query(models.Asset).all()
    return assets

@app.post("/assets/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(asset_in: AssetCreate, db: Session = Depends(database.get_db)):
    db_asset = models.Asset(
        name=asset_in.name,
        asset_type=asset_in.asset_type,
        currency=asset_in.currency,
        current_value=asset_in.initial_balance,
        quantity=asset_in.initial_quantity,
        meta_data=asset_in.meta_data
    )
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)

    if asset_in.initial_balance != 0 or asset_in.initial_quantity != 0:
        initial_tx = models.Transaction(
            asset_id=db_asset.id,
            transaction_type=models.TransactionType.INITIAL,
            amount=asset_in.initial_balance,
            quantity_change=asset_in.initial_quantity,
            balance_after=asset_in.initial_balance,
            note="Initial Balance",
            transaction_date=datetime.now()
        )
        db.add(initial_tx)
        db.commit()

    return db_asset

@app.post("/transactions/", response_model=TransactionResponse)
def create_transaction(tx_in: TransactionCreate, db: Session = Depends(database.get_db)):
    asset = db.query(models.Asset).filter(models.Asset.id == tx_in.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    new_balance = asset.current_value + tx_in.amount
    new_quantity = asset.quantity + tx_in.quantity_change

    asset.current_value = new_balance
    asset.quantity = new_quantity

    db_tx = models.Transaction(
        asset_id=tx_in.asset_id,
        transaction_type=tx_in.transaction_type,
        amount=tx_in.amount,
        quantity_change=tx_in.quantity_change,
        price_at_transaction=tx_in.price_at_transaction,
        balance_after=new_balance,
        note=tx_in.note,
        transaction_date=datetime.now()
    )
    
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    
    return db_tx

@app.get("/assets/{asset_id}/transactions", response_model=List[TransactionResponse])
def read_asset_transactions(
    asset_id: int, 
    limit: int = 20, 
    db: Session = Depends(database.get_db)
):
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    transactions = db.query(models.Transaction)\
        .filter(models.Transaction.asset_id == asset_id)\
        .order_by(desc(models.Transaction.transaction_date))\
        .limit(limit)\
        .all()
        
    return transactions

@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(database.get_db)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    asset = tx.asset

    asset.current_value -= tx.amount
    asset.quantity -= tx.quantity_change

    db.delete(tx)
    db.commit()

    return {"message": "Transaction deleted and asset balance rolled back"}

@app.get("/market/stock/{ticker}", response_model=StockPriceResponse)
def get_stock_price(ticker: str, region: str = "US"):
    try:
        data = market.get_stock_data(ticker, region.upper())
        
        return {
            "ticker": data["symbol"],
            "price": data["price"],
            "currency": data["currency"]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"系統錯誤: {str(e)}")
    
@app.get("/market/rate")
def get_exchange_rate(from_curr: str, to_curr: str):
    try:
        rate = market.get_exchange_rate(from_curr, to_curr)
        return {
            "from": from_curr.upper(),
            "to": to_curr.upper(),
            "rate": rate,
            "updated_at": datetime.now()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"系統錯誤: {str(e)}")