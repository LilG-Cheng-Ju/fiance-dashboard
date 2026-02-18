import { TransactionType } from './asset.model';

/**
 * Represents a transaction record as returned by the backend.
 * Matches schemas.TransactionResponse in backend/src/schemas.py
 */
export interface Transaction {
  id: number;
  asset_id: number;
  transaction_type: TransactionType;

  // The change in the asset's book value (native currency)
  amount: number;
  
  // The change in quantity (e.g., shares, units)
  quantity_change: number;

  // The book value balance after this transaction
  balance_after: number;

  // Realized Profit/Loss (only relevant for SELL/REDUCE transactions)
  realized_pnl?: number;

  exchange_rate: number;

  // --- Dual Track Mechanism Fields ---
  // The actual amount deducted/received in the source currency (e.g., TWD cost for USD stock)
  source_amount?: number;
  source_currency?: string;

  note?: string;
  transaction_date: string; // ISO 8601 String
  related_transaction_id?: number;
}

/**
 * Payload for creating a new transaction.
 * Matches schemas.TransactionCreate in backend/src/schemas.py
 */
export interface TransactionCreate {
  asset_id: number;
  transaction_type: TransactionType;

  // Total amount change (negative for buy/outflow, positive for sell/inflow)
  amount: number;

  // Quantity change (positive for buy, negative for sell)
  // Optional in frontend because backend defaults to 0.0
  quantity_change?: number;

  price_at_transaction?: number;
  exchange_rate?: number;

  // --- Dual Track Mechanism Fields ---
  source_amount?: number;
  source_currency?: string;

  note?: string;
  
  // Optional: if not provided, backend uses current server time
  transaction_date?: string; 
  
  related_transaction_id?: number;
}
