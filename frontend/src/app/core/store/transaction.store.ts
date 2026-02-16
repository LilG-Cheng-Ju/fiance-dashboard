import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe } from 'rxjs';
import { switchMap, tap, mergeMap } from 'rxjs/operators';

import { TransactionService } from '../services/transaction.service';
import { Transaction, TransactionCreate } from '../models/transaction.model';
import { AssetStore } from './asset.store';

type TransactionState = {
  transactions: Transaction[];
  currentAssetId: number | null;
  isLoading: boolean;
  error: string | null;
};

const initialState: TransactionState = {
  transactions: [],
  currentAssetId: null,
  isLoading: false,
  error: null,
};

export const TransactionStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed(({ transactions }) => ({
    count: computed(() => transactions().length),
    hasTransactions: computed(() => transactions().length > 0),
  })),

  withMethods((store, txService = inject(TransactionService), assetStore = inject(AssetStore)) => ({
    
    // Load transactions for a specific asset
    loadTransactionsByAsset: rxMethod<{ assetId: number; limit?: number }>(
      pipe(
        tap(({ assetId }) => 
          patchState(store, { 
            isLoading: true, 
            error: null, 
            currentAssetId: assetId,
            transactions: [] // Clear previous data to avoid flickering
          })
        ),
        switchMap(({ assetId, limit }) =>
          txService.getTransactionsByAsset(assetId, limit || 50).pipe(
            tapResponse({
              next: (transactions) =>
                patchState(store, {
                  transactions,
                  isLoading: false,
                }),
              error: (err: any) =>
                patchState(store, {
                  isLoading: false,
                  error: err?.message || 'Failed to load transactions',
                }),
            }),
          ),
        ),
      ),
    ),

    // Create a new transaction
    addTransaction: rxMethod<TransactionCreate>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((txData) =>
          txService.createTransaction(txData).pipe(
            tapResponse({
              next: (newTx) => {
                // 1. Update local list if we are viewing this asset
                if (store.currentAssetId() === newTx.asset_id) {
                  patchState(store, (state) => ({
                    transactions: [newTx, ...state.transactions],
                    isLoading: false,
                  }));
                } else {
                  patchState(store, { isLoading: false });
                }

                // 2. Refresh AssetStore because balance/cost has changed
                assetStore.loadAssets();
              },
              error: (err: any) =>
                patchState(store, {
                  isLoading: false,
                  error: err?.message || 'Failed to create transaction',
                }),
            }),
          ),
        ),
      ),
    ),

    // Delete a transaction
    deleteTransaction: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        mergeMap((id) =>
          txService.deleteTransaction(id).pipe(
            tapResponse({
              next: () => {
                // 1. Remove from local list
                patchState(store, (state) => ({
                  transactions: state.transactions.filter((t) => t.id !== id),
                  isLoading: false,
                }));

                // 2. Refresh AssetStore to update balances
                assetStore.loadAssets();
              },
              error: (err: any) =>
                patchState(store, {
                  isLoading: false,
                  error: err?.message || 'Failed to delete transaction',
                }),
            }),
          ),
        ),
      ),
    ),
    
    // Reset state (e.g., when closing modal)
    clearState() {
      patchState(store, initialState);
    }
  })),
);
