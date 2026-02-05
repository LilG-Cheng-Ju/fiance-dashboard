export interface StockPrice {
  ticker: string;
  price: number;
  currency: string;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  updated_at: string; // ISO 8601
}
