from datetime import datetime
from fastapi import APIRouter, HTTPException

from src import schemas
from src.services import market # This imports your existing market.py logic

router = APIRouter(
    prefix="/market",
    tags=["Market"]
)

@router.get("/stock/{ticker}", response_model=schemas.StockPriceResponse)
def get_stock_price(ticker: str, region: str = "US"):
    try:
        # Call the existing service logic
        data = market.get_stock_data(ticker, region.upper())
        
        return {
            "ticker": data["symbol"],
            "price": data["price"],
            "currency": data["currency"]
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get stock price error: {str(e)}")

@router.get("/rate", response_model=schemas.ExchangeRateResponse)
def get_exchange_rate(from_curr: str, to_curr: str):
    try:
        # Call the existing service logic
        rate = market.get_exchange_rate(from_curr, to_curr)
        
        return {
            "from_currency": from_curr.upper(), # Matches the schema field name
            "to_currency": to_curr.upper(),
            "rate": rate,
            "updated_at": datetime.now()
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Get exchange rate error: {str(e)}")