import yfinance as yf
from src.utils import TTLCache
from urllib.parse import urlparse
import os

LOGO_DEV_TOKEN = os.getenv("LOGO_DEV_TOKEN")

SUPPORTED_CURRENCIES = {
    "TWD",
    "JPY",
    "SGD",
    "USD",
    "KRW",
    "CNY",
    "RMB",
    "EUR",
    "GBP",
    "AUD",
    "CAD",
}

stock_cache = TTLCache(ttl_seconds=60)
rate_cache = TTLCache(ttl_seconds=300)


def normalize_ticker(ticker: str, region: str = "US") -> list[str]:
    ticker = ticker.upper().strip()
    target_ticker = ticker

    if region == "TW":
        if not (ticker.endswith(".TW") or ticker.endswith(".TWO")):
            target_ticker = f"{ticker}.TW"
    elif region == "JP":
        if not (ticker.endswith(".T")):
            target_ticker = f"{ticker}.T"

    tickers_to_try = [target_ticker]

    if region == "TW" and target_ticker.endswith(".TW"):
        tickers_to_try.append(target_ticker.replace(".TW", ".TWO"))

    return tickers_to_try


def get_stock_data(ticker: str, region: str = "US") -> dict:
    """
    Fetch stock information including price and currency.
    Args:
        ticker: Stock symbol (e.g., "2330", "AAPL").
        region: Region ("TW" for Taiwan stocks, "US" for US stocks).
    Returns:
        dict: A dictionary containing the stock's symbol, price, and currency.
    Raises:
        ValueError: If the stock cannot be found for the given ticker and region.
    """

    tickers_to_try = normalize_ticker(ticker, region)

    for t in tickers_to_try:
        try:
            cached_data = stock_cache.get(f"STOCK_{t}")
            if cached_data:
                return cached_data

            stock = yf.Ticker(t)

            price = stock.fast_info.last_price
            currency = stock.fast_info.currency

            if price and currency:
                result_data = {"symbol": t, "price": price, "currency": currency}
                stock_cache.set(f"STOCK_{t}", result_data)
                return result_data
        except Exception:
            continue

    raise ValueError(f"無法找到股票: {ticker} (Region: {region})")


def build_logo_url(website: str) -> str | None:
    """
    Build stock website URL.
    """

    domain = urlparse(website).netloc.replace("www.", "")

    if LOGO_DEV_TOKEN:
        return f"https://img.logo.dev/{domain}?token={LOGO_DEV_TOKEN}"
    else:
        return None


def get_stock_profile(ticker: str, region: str = "US") -> dict:
    """
    Fetch stock profile information including website and logo URL.
    """

    tickers_to_try = normalize_ticker(ticker, region)

    for t in tickers_to_try:
        try:
            stock = yf.Ticker(t)

            info = stock.get_info()
            website = info.get("website")

            if not website:
                continue

            # 解析 domain
            logo_url = build_logo_url(website)

            return {"symbol": t, "website": website, "logo_url": logo_url}

        except Exception:
            continue

    return {"symbol": ticker, "website": None, "logo_url": None}


def get_exchange_rate(from_curr: str, to_curr: str) -> float:
    """
    Uses USD as an intermediary currency to calculate cross rates.
    Args:
        from_curr (str): Source currency code (e.g., 'USD', 'TWD', 'EUR').
            Case-insensitive. Must be in SUPPORTED_CURRENCIES.
        to_curr (str): Target currency code (e.g., 'USD', 'TWD', 'EUR').
            Case-insensitive. Must be in SUPPORTED_CURRENCIES.
    Returns:
        float: Exchange rate from source currency to target currency,
            rounded to 4 decimal places.
    Raises:
        ValueError: If currency code is not supported or if exchange rate
            query fails. Error messages are in Traditional Chinese.
    Formula:
        Rate(A -> B) = Rate(USD -> B) / Rate(USD -> A)
    Example:
        >>> get_exchange_rate('TWD', 'EUR')
        0.0295  # 1 TWD = 0.0295 EUR

    """
    from_curr = from_curr.upper()
    to_curr = to_curr.upper()

    if from_curr not in SUPPORTED_CURRENCIES:
        raise ValueError(f"不支援的貨幣: {from_curr}")
    if to_curr not in SUPPORTED_CURRENCIES:
        raise ValueError(f"不支援的貨幣: {to_curr}")

    if from_curr == to_curr:
        return 1.0

    try:
        usd_to_from = 1.0
        if from_curr != "USD":
            usd_to_from = _fetch_yahoo_currency(from_curr)

        usd_to_to = 1.0
        if to_curr != "USD":
            usd_to_to = _fetch_yahoo_currency(to_curr)

        rate = usd_to_to / usd_to_from

        return round(rate, 4)

    except Exception as e:
        raise ValueError(f"匯率查詢失敗: {e}")


def _fetch_yahoo_currency(currency: str) -> float:
    """
    Fetch USD to target currency exchange rate from Yahoo Finance.
    Args:
        currency: Target currency code (e.g., 'CNY', 'EUR')
    Returns:
        float: Exchange rate from USD to target currency
    Raises:
        ValueError: If exchange rate not found on Yahoo Finance

    """
    if currency == "RMB":
        symbol = "CNY=X"
    else:
        symbol = f"{currency}=X"

    cached_price = rate_cache.get(f"RATE_{symbol}")
    if cached_price:
        return cached_price

    ticker = yf.Ticker(symbol)
    price = ticker.fast_info.last_price

    if not price:
        raise ValueError(f"Yahoo 查無此匯率: {symbol}")

    rate_cache.set(f"RATE_{symbol}", price)
    return price
