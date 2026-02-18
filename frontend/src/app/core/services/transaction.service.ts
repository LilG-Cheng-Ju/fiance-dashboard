import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Transaction, TransactionCreate } from '../models/transaction.model';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private http = inject(HttpClient);

  // API endpoints based on backend routing
  private readonly TX_API_URL = '/api/transactions';
  private readonly ASSET_API_URL = '/api/assets';

  /**
   * Fetch transaction history for a specific asset.
   * Backend: GET /assets/{asset_id}/transactions
   */
  getTransactionsByAsset(assetId: number, limit: number = 20): Observable<Transaction[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<Transaction[]>(`${this.ASSET_API_URL}/${assetId}/transactions`, { params });
  }

  /**
   * Create a new transaction.
   * Backend: POST /transactions/
   */
  createTransaction(transaction: TransactionCreate): Observable<Transaction> {
    return this.http.post<Transaction>(this.TX_API_URL, transaction);
  }

  /**
   * Delete a transaction by ID.
   * Backend: DELETE /transactions/{transaction_id}
   */
  deleteTransaction(id: number): Observable<void> {
    return this.http.delete<void>(`${this.TX_API_URL}/${id}`);
  }
}
