import enum
from datetime import datetime

from sqlalchemy import (JSON, Boolean, Column, DateTime, Enum, Float,
                        ForeignKey, Integer, String)
from sqlalchemy.orm import relationship
from src.database import Base


class AssetType(str, enum.Enum):
    CASH = "CASH"               # 現金 / 銀行帳戶
    STOCK = "STOCK"             # 股票 / 基金 / ETF
    CRYPTO = "CRYPTO"           # 加密貨幣
    GOLD = "GOLD"               # 黃金 / 貴金屬
    LIABILITY = "LIABILITY"     # 長期負債 (房貸、信貸)
    CREDIT_CARD = "CREDIT_CARD" # 信用卡
    PENDING = "PENDING"         # 待結算款項
    
class AssetStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"

class TransactionType(str, enum.Enum):
    INITIAL = "INITIAL"           # 初始
    DEPOSIT = "DEPOSIT"           # 入金
    WITHDRAW = "WITHDRAW"         # 出金
    BUY = "BUY"                   # 買入
    SELL = "SELL"                 # 賣出
    TRANSFER_OUT = "TRANSFER_OUT" # 轉帳 (轉出)
    TRANSFER_IN = "TRANSFER_IN"   # 轉帳 (轉入)
    ADJUSTMENT = "ADJUSTMENT"     # 校正
    INTEREST = "INTEREST"         # 利息/股息


class Asset(Base):
    __tablename__ = 'assets'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    
    asset_type = Column(Enum(AssetType), nullable=False)
    
    status = Column(Enum(AssetStatus), default=AssetStatus.ACTIVE)

    # whether to include this asset in net worth calculation
    include_in_net_worth = Column(Boolean, default=True)

    quantity = Column(Float, default=0.0) 
    average_cost = Column(Float, default=0.0) 
    current_value = Column(Float, default=0.0) # Book balance

    currency = Column(String(3), default="TWD", nullable=False)
    symbol = Column(String, nullable=True)
    meta_data = Column(JSON, default={}) 

    transactions = relationship("Transaction", back_populates="asset", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    
    asset_id = Column(Integer, ForeignKey("assets.id"))
    
    transaction_type = Column(Enum(TransactionType), nullable=False)

    amount = Column(Float, nullable=False)
    
    quantity_change = Column(Float, default=0.0)

    price_at_transaction = Column(Float, nullable=True)
    
    exchange_rate = Column(Float, default=1.0, nullable=False)

    balance_after = Column(Float) # book balance after this transaction

    realized_pnl = Column(Float, nullable=True) # realized profit and loss for this transaction

    note = Column(String, nullable=True)
    
    # For linking related transactions, e.g., use cash transaction ID for stock buy/sell
    related_transaction_id = Column(Integer, nullable=True)

    transaction_date = Column(DateTime, default=datetime.now)
    
    asset = relationship("Asset", back_populates="transactions")