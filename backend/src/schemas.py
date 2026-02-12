from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field
from src import models


# --- Transaction Schemas ---
class TransactionCreate(BaseModel):
    asset_id: int
    transaction_type: models.TransactionType
    amount: float = Field(..., description="Total amount change (negative for buy, positive for sell)")
    quantity_change: float = Field(0.0, description="Quantity change (positive for buy, negative for sell)")
    price_at_transaction: Optional[float] = None
    exchange_rate: float = Field(1.0, description="Exchange rate at transaction")
    source_amount: Optional[float] = Field(None, description="Actual deducted amount in source currency")
    source_currency: Optional[str] = Field(None, description="Source currency code (e.g., TWD)")
    note: Optional[str] = None
    related_transaction_id: Optional[int] = None

class TransactionResponse(BaseModel):
    id: int
    asset_id: int
    transaction_type: models.TransactionType
    amount: float
    quantity_change: float
    balance_after: float
    # how much the profit/loss realized in this transaction
    realized_pnl: Optional[float] = None
    exchange_rate: float
    
    source_amount: Optional[float]
    source_currency: Optional[str]
    
    note: Optional[str]
    transaction_date: datetime
    related_transaction_id: Optional[int]

    class Config:
        orm_mode = True

# --- Asset Schemas ---
class AssetCreate(BaseModel):
    name: str
    asset_type: models.AssetType
    currency: str = "TWD"
    symbol: Optional[str] = None
    
    initial_total_cost: float = Field(0.0, description="Initial total cost / initial balance")
    initial_quantity: float = Field(0.0, description="Initial quantity")
    
    source_asset_id: Optional[int] = Field(None, description="ID of the asset used to pay for this new asset")
    
    source_amount: Optional[float] = Field(None, description="Actual initial deducted amount")
    source_currency: Optional[str] = Field(None, description="Initial source currency code")
    exchange_rate: Optional[float] = Field(1.0, description="Exchange rate at the time of creation")
    
    transaction_time: Optional[datetime] = Field(
        default=None, 
        description="The time of the initial transaction. If provided, overrides current time."
    )
    include_in_net_worth: bool = True
    meta_data: Optional[Dict[str, Any]] = {}

class AssetResponse(BaseModel):
    id: int
    name: str
    asset_type: models.AssetType
    status: models.AssetStatus  # Status (ACTIVE / ARCHIVED)
    
    currency: str
    symbol: Optional[str]
    
    quantity: float       # Current holding quantity
    average_cost: float   # Average cost (used for profit and loss calculation)
    book_value: float  # Current book value
    
    include_in_net_worth: bool 
    meta_data: Optional[Dict[str, Any]]

    class Config:
        orm_mode = True

class StockPriceResponse(BaseModel):
    ticker: str
    price: float
    currency: str
    
class ExchangeRateResponse(BaseModel):
    from_currency: str = Field(..., alias="from")
    to_currency: str = Field(..., alias="to")
    rate: float
    updated_at: datetime

    class Config:
        populate_by_name = True # Allows using "from_currency" in code