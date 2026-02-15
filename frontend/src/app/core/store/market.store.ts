import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, timer, of } from 'rxjs';
import { switchMap, tap, filter } from 'rxjs/operators';

import { MarketService } from '../services/market.service';
import { StockPrice } from '../models/market.model';

type MarketState = {
  prices: Record<string, StockPrice>; 
  trackingSymbols: { ticker: string; region: string }[]; 
  isLoading: boolean;
  error: any;
};

const initialState: MarketState = {
  prices: {},
  trackingSymbols: [],
  isLoading: false,
  error: null,
};

const FETCH_INTERVAL = 120000; 

export const MarketStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed((store) => ({
    priceMap: computed(() => store.prices()),
    hasPrices: computed(() => Object.keys(store.prices()).length > 0),
  })),

  withMethods((store, marketService = inject(MarketService)) => {
    
    // 1. [Worker] The core logic for fetching prices
    // isBackground: true = Silent update (no loading spinner)
    const fetchPrices = rxMethod<{ symbols: { ticker: string; region: string }[]; isBackground: boolean }>(
      pipe(
        tap(({ isBackground }) => {
          if (!isBackground) patchState(store, { isLoading: true });
        }),
        switchMap(({ symbols, isBackground }) =>
          marketService.fetchBatchPrices(symbols).pipe(
            tapResponse({
              next: (newPrices) =>
                patchState(store, (state) => ({
                  prices: { ...state.prices, ...newPrices },
                  isLoading: false, 
                  error: null,
                })),
              error: (error) => 
                patchState(store, { 
                   isLoading: false, 
                   error: isBackground ? null : error // Ignore background errors to avoid annoying popups
                }),
            }),
          ),
        ),
      ),
    );

    return {
      // Expose the worker if needed (usually private, but useful for debugging)
      fetchPrices,

      // 2. [Scheduler] Background Polling
      startTracking: rxMethod<{ ticker: string; region: string }[]>(
        pipe(
          tap((symbols) => patchState(store, { trackingSymbols: symbols })), 
          switchMap((symbols) => {
            if (symbols.length === 0) return of(null);
            
            // Timer triggers the worker
            return timer(0, FETCH_INTERVAL).pipe(
              tap(() => fetchPrices({ symbols, isBackground: true }))
            );
          })
        )
      ),

      // 3. [Trigger] Manual Refresh
      refreshPrices: rxMethod<void>(
        pipe(
          tap(() => {
            const symbols = store.trackingSymbols();
            if (symbols.length > 0) {
              // Manual trigger -> Show Loading
              fetchPrices({ symbols, isBackground: false });
            }
          })
        )
      ),
    };
  }),
);