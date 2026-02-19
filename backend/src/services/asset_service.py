from datetime import datetime
from typing import List

from fastapi import HTTPException
from sqlalchemy.orm import Session
from src import models, schemas


class AssetService:

    @staticmethod
    def get_assets(db: Session, current_user: str) -> List[models.Asset]:
        """
        Get all assets.
        Frontend should filter ARCHIVED assets if needed.
        """
        return db.query(models.Asset).filter(models.Asset.user_id == current_user).all()

    @staticmethod
    def create_asset(
        db: Session, asset_in: schemas.AssetCreate, current_user: str
    ) -> models.Asset:
        """
        Create a new asset.
        Auto-calculates quantity/cost based on asset type.
        Creates a 'Genesis' Transaction if initial balance is provided.

        If `source_asset_id` is provided:
          1. Deducts funds from the source asset (creates a TRANSFER_OUT transaction).
          2. Creates the new asset.
          3. Creates an INITIAL transaction for the new asset, linked to the source transaction.

        Uses explicit commit/rollback to ensure atomicity.
        """

        try:
            # 1. Safety Check & Auto-fill logic
            final_quantity = asset_in.initial_quantity
            final_current_value = asset_in.initial_total_cost

            if final_quantity != 0:
                final_avg_cost = final_current_value / final_quantity
            else:
                final_avg_cost = 1.0

            # 2. Prepare Source Transaction (Funding Logic)
            related_tx_id = None

            if asset_in.source_asset_id:
                # Fetch the source asset (e.g., Bank Account)
                source_asset = (
                    db.query(models.Asset)
                    .filter(
                        models.Asset.id == asset_in.source_asset_id,
                        models.Asset.user_id == current_user
                    )
                    .first()
                )
                if not source_asset:
                    raise HTTPException(
                        status_code=404, detail="Source asset not found"
                    )

                # Calculate deduction amount
                # Use source_amount if provided (e.g. TWD cost), otherwise default to initial cost (if same currency)
                deduct_amount = (
                    asset_in.source_amount
                    if asset_in.source_amount is not None
                    else asset_in.initial_total_cost
                )

                if deduct_amount > 0:
                    # Create withdrawal transaction for source asset
                    # Using TRANSFER_OUT to indicate funds moved to another asset
                    source_tx = models.Transaction(
                        asset_id=source_asset.id,
                        user_id=current_user,
                        transaction_type=models.TransactionType.TRANSFER_OUT,
                        amount=-deduct_amount,  # Negative for deduction
                        # Estimate balance after deduction
                        balance_after=source_asset.book_value - deduct_amount,
                        note=f"扣款: 新增資產 {asset_in.name}",
                        transaction_date=asset_in.transaction_time or datetime.now(),
                    )
                    db.add(source_tx)
                    db.flush()  # Flush to generate source_tx.id immediately

                    # Update Source Asset Balance
                    source_asset.book_value -= deduct_amount
                    # For Cash assets, quantity usually tracks book_value
                    if source_asset.asset_type == models.AssetType.CASH:
                        source_asset.quantity -= deduct_amount

                    related_tx_id = source_tx.id

            # 3. Create Asset Record
            db_asset = models.Asset(
                name=asset_in.name,
                asset_type=asset_in.asset_type,
                user_id=current_user,
                symbol=asset_in.symbol,
                currency=asset_in.currency,
                # Core Inventory Fields
                quantity=final_quantity,
                book_value=final_current_value,
                average_cost=final_avg_cost,
                include_in_net_worth=asset_in.include_in_net_worth,
                meta_data=asset_in.meta_data,
                status=models.AssetStatus.ACTIVE,
            )
            db.add(db_asset)
            db.flush()  # Flush to generate db_asset.id

            # 4. Create Initial Transaction (Genesis Block)
            # We manually create this here instead of calling TransactionService to avoid circular dependency
            if asset_in.initial_total_cost != 0 or asset_in.initial_quantity != 0:
                tx_time = asset_in.transaction_time or datetime.now()
                initial_tx = models.Transaction(
                    asset_id=db_asset.id,
                    transaction_type=models.TransactionType.INITIAL,
                    amount=asset_in.initial_total_cost,  # Cost basis in Native Currency
                    quantity_change=final_quantity,  # Initial Qty
                    balance_after=final_current_value,
                    note="初始餘額",
                    transaction_date=tx_time,
                    # Link to source transaction (if any)
                    related_transaction_id=related_tx_id,
                    # Store Exchange Rate & Source Cost
                    exchange_rate=asset_in.exchange_rate,
                    source_amount=asset_in.source_amount,
                    source_currency=asset_in.source_currency,
                    user_id=current_user,
                )
                db.add(initial_tx)

            # 🛡️ 5. Commit All Changes
            db.commit()
            db.refresh(db_asset)
            return db_asset

        except Exception as e:
            # Rollback all changes (source deduction + new asset creation) if anything fails
            db.rollback()
            raise e

    @staticmethod
    def update_asset(
        db: Session, asset_id: int, asset_update: schemas.AssetUpdate, current_user: str
    ) -> models.Asset:
        """
        Update asset details (Name, Symbol, Metadata, etc.)
        """
        asset = (
            db.query(models.Asset)
            .filter(models.Asset.id == asset_id, models.Asset.user_id == current_user)
            .first()
        )
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        update_data = asset_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(asset, key, value)

        db.commit()
        db.refresh(asset)
        return asset

    @staticmethod
    def delete_asset(db: Session, asset_id: int, current_user: str) -> None:
        """
        Delete an asset and all its transactions.
        """
        asset = (
            db.query(models.Asset)
            .filter(models.Asset.id == asset_id, models.Asset.user_id == current_user)
            .first()
        )
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        db.delete(asset)
        db.commit()
