from datetime import date
from typing import Dict
from sqlalchemy.orm import Session
from src import models
from src.services import market

class SnapshotService:
    @staticmethod
    def create_daily_snapshot(db: Session, user_id: str, snapshot_date: date = None) -> float:
        """
        Creates or updates the asset snapshot for a specific user and date.
        
        Logic:
        1. total_net_worth: STRICTLY sums only assets with include_in_net_worth=True.
        2. breakdown: 
           - For Assets (Cash, Stock): Include only if include_in_net_worth=True.
           - For Liabilities (Card, Loan): ALWAYS include (to track debt trends).
        """
        if not snapshot_date:
            snapshot_date = date.today()

        # 1. Fetch active assets for the user
        assets = db.query(models.Asset).filter(
            models.Asset.user_id == user_id,
            models.Asset.status == models.AssetStatus.ACTIVE
        ).all()

        total_net_worth = 0.0
        breakdown: Dict[str, float] = {}

        # 2. Iterate through assets to calculate values
        for asset in assets:
            
            # --- Valuation Logic (Same as before) ---
            is_market_asset = asset.asset_type in [
                models.AssetType.STOCK,
                models.AssetType.CRYPTO,
                models.AssetType.GOLD
            ]

            # Get current market price (in native currency)
            current_price = 1.0
            if is_market_asset:
                if asset.symbol:
                    try:
                        region = asset.meta_data.get("region", "US") if asset.meta_data else "US"
                        # Optimization: In production, batch fetch prices outside the loop
                        quote = market.get_stock_data(asset.symbol, region)
                        current_price = quote.get("price", 0.0)
                    except Exception:
                        current_price = asset.average_cost
                else:
                    current_price = asset.average_cost

            # Calculate Native Market Value
            native_value = 0.0
            if is_market_asset:
                price_to_use = current_price if current_price > 0 else asset.average_cost
                native_value = asset.quantity * price_to_use
            else:
                native_value = asset.book_value

            # Convert to Base Currency (TWD)
            base_currency = "TWD"
            exchange_rate = 1.0
            if asset.currency != base_currency:
                try:
                    exchange_rate = market.get_exchange_rate(asset.currency, base_currency)
                except Exception:
                    exchange_rate = 1.0
            
            base_market_value = native_value * exchange_rate
            
            if asset.include_in_net_worth:
                total_net_worth += base_market_value

            is_liability_type = asset.asset_type in [models.AssetType.LIABILITY, models.AssetType.CREDIT_CARD]
            
            should_record_in_breakdown = asset.include_in_net_worth or is_liability_type
            
            if should_record_in_breakdown:
                asset_type_key = asset.asset_type.value
                current_type_val = breakdown.get(asset_type_key, 0.0)
                breakdown[asset_type_key] = current_type_val + base_market_value

        # 3. Upsert snapshot record
        existing_snapshot = db.query(models.AssetSnapshot).filter(
            models.AssetSnapshot.user_id == user_id,
            models.AssetSnapshot.snapshot_date == snapshot_date
        ).first()

        if existing_snapshot:
            existing_snapshot.total_net_worth = total_net_worth
            existing_snapshot.breakdown = breakdown
        else:
            new_snapshot = models.AssetSnapshot(
                user_id=user_id,
                snapshot_date=snapshot_date,
                total_net_worth=total_net_worth,
                breakdown=breakdown
            )
            db.add(new_snapshot)
        
        db.commit()
        
        return total_net_worth
