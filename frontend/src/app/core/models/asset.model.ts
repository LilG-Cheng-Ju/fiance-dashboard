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
  DIVIDEND = 'DIVIDEND',
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

/**
 * Interface for UI display purposes.
 * Extends the base Asset with computed fields calculated by the Dashboard.
 */
export interface AssetView extends Asset {
  // 目前市場單價 (例如股價)
  marketPrice: number;
  
  // 原幣總市值 (例如 100 USD)
  nativeMarketValue: number;
  
  // 換算回本位幣的總市值 (例如 3200 TWD)
  baseMarketValue: number;
  
  // 顯示用的幣別符號 (例如 'USD' 或 'TWD')
  displayCurrency: string;
  
  // 顯示用的金額 (對應 displayCurrency)
  displayAmount: number;
  
  // 換算回本位幣的未實現損益 (帳面損益)
  unrealizedPnl: number;
  
  // 投資報酬率 (%)
  returnRate: number;
  
  // 用於換算的匯率 (資產幣別 -> 本位幣)
  exchangeRate: number;

  // [新增] 根據歷史紀錄計算的真實總損益 (含匯差)
  totalPnl?: number;
  totalReturnRate?: number;

  // [新增] 加權平均成本匯率 (總本位幣成本 / 總原幣成本)
  avgExchangeRate?: number;
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

export interface AssetUpdate {
  name?: string;
  symbol?: string;
  include_in_net_worth?: boolean;
  meta_data?: any;
}

// for UI display with market data
export interface AssetWithMarketValue extends Asset {
  market_price?: number;
  market_value: number;
  unrealized_pnl: number;
  pnl_percentage: number;
}
