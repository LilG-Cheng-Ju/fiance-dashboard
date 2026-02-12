export enum AssetType {
  CASH = 'CASH',
  STOCK = 'STOCK',
  CRYPTO = 'CRYPTO',
  GOLD = 'GOLD',
  LIABILITY = 'LIABILITY',
  CREDIT_CARD = 'CREDIT_CARD',
  PENDING = 'PENDING',
}

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum TransactionType {
  INITIAL = 'INITIAL',
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  BUY = 'BUY',
  SELL = 'SELL',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
  ADJUSTMENT = 'ADJUSTMENT',
  INTEREST = 'INTEREST',
}

export interface Asset {
  id: number;
  name: string;
  asset_type: AssetType;
  status: AssetStatus;

  currency: string;
  symbol?: string;

  quantity: number;
  average_cost: number;
  book_value: number; // Book Value for assets like STOCK, CASH balance for CASH type

  include_in_net_worth: boolean;
  meta_data?: any;
}

export interface AssetCreate {
  name: string;
  asset_type: AssetType;
  currency: string;
  symbol?: string;

  initial_total_cost: number;
  initial_quantity: number;

  transaction_time?: string; // ISO format, e.g. "2024-01-01T00:00:00Z"
  include_in_net_worth: boolean;

  source_asset_id?: number | null; // ID of the asset used to pay (e.g., Bank Account ID)
  source_amount?: number | null;   // Actual amount deducted from source (e.g., TWD amount)
  source_currency?: string | null; // Currency of the source asset
  exchange_rate?: number | null;   // Exchange rate used for this transaction
  
  meta_data?: any;
}

// for UI display with market data
export interface AssetWithMarketValue extends Asset {
  market_price?: number;
  market_value: number;
  unrealized_pnl: number;
  pnl_percentage: number;
}
