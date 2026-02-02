import enum
from datetime import datetime

from sqlalchemy import (JSON, Column, DateTime, Enum, Float, ForeignKey,
                        Integer, String)
from sqlalchemy.orm import relationship

from src.database import Base


class AssetType(str, enum.Enum):
    CASH = "CASH"           
    STOCK = "STOCK"         # 股票
    CRYPTO = "CRYPTO"       # 加密貨幣
    GOLD = "GOLD"           # 黃金
    LIABILITY = "LIABILITY" # 負債

class TransactionType(str, enum.Enum):
    INITIAL = "INITIAL"       # 初始餘額
    DEPOSIT = "DEPOSIT"       # 存款 / 入金
    WITHDRAW = "WITHDRAW"     # 提款 / 出金
    BUY = "BUY"               # 買入 (股票/商品)
    SELL = "SELL"             # 賣出
    ADJUSTMENT = "ADJUSTMENT" # 手動校正 (例如獲利重算)
    INTEREST = "INTEREST"     # 利息 / 股息


class Asset(Base):
    __tablename__ = 'assets'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    
    asset_type = Column(Enum(AssetType), nullable=False)
    
    current_value = Column(Float, default=0.0)
    
    currency = Column(String(3), default="TWD", nullable=False)

    quantity = Column(Float, default=0.0)
    
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

    balance_after = Column(Float)

    note = Column(String, nullable=True)

    transaction_date = Column(DateTime, default=datetime.now)
    
    asset = relationship("Asset", back_populates="transactions")