import { TransactionType } from './asset.model';

export interface Transaction {
  id: number;
  asset_id: number;
  transaction_type: TransactionType;
  
  amount: number;
  quantity_change: number;
  
  balance_after: number;
  realized_pnl?: number;
  
  exchange_rate: number;
  note?: string;
  transaction_date: string; // ISO String
  related_transaction_id?: number;
}

export interface TransactionCreate {
  asset_id: number;
  transaction_type: TransactionType;
  amount: number;
  quantity_change: number;
  price_at_transaction?: number;
  exchange_rate?: number;
  note?: string;
  related_transaction_id?: number;
}