from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src import models
from src import schemas

class AssetService:
    
    @staticmethod
    def get_assets(db: Session) -> List[models.Asset]:
        """
        Get all assets. 
        Frontend should filter ARCHIVED assets if needed.
        """
        return db.query(models.Asset).all()

    @staticmethod
    def create_asset(db: Session, asset_in: schemas.AssetCreate) -> models.Asset:
        """
        Create a new asset.
        Auto-calculates quantity/cost based on asset type.
        Creates a 'Genesis' Transaction if initial balance is provided.
        """
        
        # 1. Safety Check & Auto-fill logic
        # For CASH-like assets, quantity equals total cost (1:1 ratio)
        if asset_in.asset_type in [
            models.AssetType.CASH, 
            models.AssetType.LIABILITY, 
            models.AssetType.PENDING, 
            models.AssetType.CREDIT_CARD
        ]:
            final_quantity = asset_in.initial_total_cost
            final_avg_cost = 1.0
            final_current_value = asset_in.initial_total_cost
        else:
            # For STOCK/GOLD, use user input. Avoid division by zero.
            final_quantity = asset_in.initial_quantity
            final_current_value = asset_in.initial_total_cost
            final_avg_cost = (final_current_value / final_quantity) if final_quantity != 0 else 0.0

        # 2. Create Asset Record
        db_asset = models.Asset(
            name=asset_in.name,
            asset_type=asset_in.asset_type,
            symbol=asset_in.symbol,
            currency=asset_in.currency,
            
            # Core Inventory Fields
            quantity=final_quantity,
            current_value=final_current_value,
            average_cost=final_avg_cost,
            
            include_in_net_worth=asset_in.include_in_net_worth,
            meta_data=asset_in.meta_data,
            status=models.AssetStatus.ACTIVE
        )
        db.add(db_asset)
        db.commit()
        db.refresh(db_asset)

        # 3. Create Initial Transaction (Genesis Block)
        # We manually create this here instead of calling TransactionService to avoid circular dependency
        if asset_in.initial_total_cost != 0 or asset_in.initial_quantity != 0:
            initial_tx = models.Transaction(
                asset_id=db_asset.id,
                transaction_type=models.TransactionType.INITIAL,
                amount=asset_in.initial_total_cost, # Cost basis
                quantity_change=final_quantity,     # Initial Qty
                balance_after=final_current_value,
                note="Initial Balance",
                transaction_date=datetime.now()
            )
            db.add(initial_tx)
            db.commit()

        return db_asset

    @staticmethod
    def delete_asset(db: Session, asset_id: int) -> None:
        """
        Delete an asset and all its transactions.
        """
        asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        db.delete(asset)
        db.commit()