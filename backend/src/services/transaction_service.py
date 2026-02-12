from datetime import datetime
from typing import List

from fastapi import HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from src import models
from src import schemas

class TransactionService:

    @staticmethod
    def get_by_asset_id(db: Session, asset_id: int, limit: int = 20) -> List[models.Transaction]:
        """
        Get transactions for a specific asset.
        """
        # Check if asset exists first
        asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        return db.query(models.Transaction)\
            .filter(models.Transaction.asset_id == asset_id)\
            .order_by(
                desc(models.Transaction.transaction_date),
                desc(models.Transaction.id) # Secondary sort to ensure consistent order for same-date transactions
            )\
            .limit(limit)\
            .all()

    @staticmethod
    def create(db: Session, tx_in: schemas.TransactionCreate) -> models.Transaction:
        """
        Create a new transaction and update asset state (Inventory Model).
        """
        asset = db.query(models.Asset).filter(models.Asset.id == tx_in.asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        realized_pnl = None

        # Logic Branch: Inventory System (Stock/Gold) vs Simple System (Cash)
        if asset.asset_type in [models.AssetType.STOCK, models.AssetType.GOLD, models.AssetType.CRYPTO]:
            
            # Scenario A: BUY (Increase Position)
            if tx_in.quantity_change > 0:
                # Logic: Moving Average Cost
                # New Total Cost = Old Total Cost + Cost of new batch (abs(amount))
                # Note: amount is negative for BUY (outflow), so we take abs()
                cost_added = abs(tx_in.amount) 
                new_total_cost = asset.book_value + cost_added
                new_quantity = asset.quantity + tx_in.quantity_change
                
                # Update Asset
                asset.book_value = new_total_cost
                asset.quantity = new_quantity
                # Avoid division by zero
                asset.average_cost = new_total_cost / new_quantity if new_quantity > 0 else 0.0
                
                # If asset was ARCHIVED (sold out previously), reactivate it
                if asset.status == models.AssetStatus.ARCHIVED:
                    asset.status = models.AssetStatus.ACTIVE

            # Scenario B: SELL (Decrease Position)
            elif tx_in.quantity_change < 0:
                sell_qty = abs(tx_in.quantity_change)
                
                # Logic: Proportional Cost Reduction (FIFO assumption for Avg Cost)
                # Cost to remove = Sold Qty * Average Cost
                cost_removed = sell_qty * asset.average_cost
                
                # Realized P&L = Sold Price (Amount) - Cost Basis
                # Note: tx_in.amount is positive for SELL (inflow)
                realized_pnl = tx_in.amount - cost_removed
                
                # Update Asset
                asset.book_value -= cost_removed
                asset.quantity += tx_in.quantity_change # quantity_change is negative
                
                # Logic: Zero Inventory Check
                # Use epsilon for float comparison safety
                if asset.quantity <= 0.000001: 
                    asset.quantity = 0
                    asset.book_value = 0
                    # Note: We keep average_cost as is, or reset? 
                    # Usually keeping it is fine until next buy resets it.
                    asset.status = models.AssetStatus.ARCHIVED

        else:
            # Scenario C: CASH / PENDING / LIABILITY / CREDIT_CARD
            # Logic: Simple Accumulation
            asset.book_value += tx_in.amount
            # For cash, quantity tracks amount
            asset.quantity += tx_in.quantity_change if tx_in.quantity_change != 0 else tx_in.amount

        # Create Transaction Record
        db_tx = models.Transaction(
            asset_id=tx_in.asset_id,
            transaction_type=tx_in.transaction_type,
            amount=tx_in.amount,
            quantity_change=tx_in.quantity_change,
            price_at_transaction=tx_in.price_at_transaction,
            exchange_rate=tx_in.exchange_rate,
            
            source_amount=tx_in.source_amount,
            source_currency=tx_in.source_currency,
            
            balance_after=asset.book_value, # Records the Book Value (Total Cost)
            realized_pnl=realized_pnl,
            related_transaction_id=tx_in.related_transaction_id,
            note=tx_in.note,
            transaction_date=datetime.now()
        )
        
        db.add(db_tx)
        db.commit()
        db.refresh(db_tx)
        
        return db_tx

    @staticmethod
    def delete(db: Session, transaction_id: int) -> dict:
        """
        Delete a transaction and Rollback the asset state.
        Note: This is a simple rollback. For strict accounting, 
        Event Sourcing Re-calculation is recommended in the future.
        """
        tx = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
        if not tx:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        asset = tx.asset

        # Reverse the impact
        if asset.asset_type in [models.AssetType.STOCK, models.AssetType.GOLD, models.AssetType.CRYPTO]:
            if tx.quantity_change > 0: # Was a BUY
                # Reverse: Decrease Cost and Qty
                cost_to_reverse = abs(tx.amount)
                asset.book_value -= cost_to_reverse
                asset.quantity -= tx.quantity_change
            else: # Was a SELL
                 # Reverse: Add back Cost and Qty
                 # cost_removed = amount - realized_pnl
                 cost_restored = tx.amount - (tx.realized_pnl if tx.realized_pnl else 0)
                 asset.book_value += cost_restored
                 asset.quantity -= tx.quantity_change # minus negative = plus
            
            # Recalculate Avg Cost
            if asset.quantity > 0:
                asset.average_cost = asset.book_value / asset.quantity
                asset.status = models.AssetStatus.ACTIVE
        else:
            # Cash: Simple reverse
            asset.book_value -= tx.amount
            # If quantity_change was used, reverse it; otherwise reverse amount
            qty_delta = tx.quantity_change if tx.quantity_change != 0 else tx.amount
            asset.quantity -= qty_delta

        db.delete(tx)
        db.commit()

        return {"message": "Transaction deleted and asset balance rolled back"}