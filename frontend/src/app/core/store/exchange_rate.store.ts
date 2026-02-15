import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe } from 'rxjs';
import { tap, mergeMap } from 'rxjs/operators';

import { RateService } from '../services/exchange_rate.service';
import { ExchangeRate } from '../models/market.model';
import { SUPPORTED_CURRENCIES } from '../config/currency.config';

type RateState = {
  rates: Record<string, number>; 
  timestamps: Record<string, number>; 
  isLoading: boolean;
  error: any;
};

const initialState: RateState = {
  rates: {},
  timestamps: {},
  isLoading: false,
  error: null,
};

export const RateStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  withComputed((store) => ({
    rateMap: computed(() => store.rates()),
    rateTimestamps: computed(() => store.timestamps()),
    loading: computed(() => store.isLoading()),
    currencies: computed(() => SUPPORTED_CURRENCIES),
    foreignCurrencies: computed(() => 
      SUPPORTED_CURRENCIES.filter(c => c !== 'TWD')
    ),
  })),

  withMethods((store, rateService = inject(RateService)) => ({
    
    // Action: loadRate with optional 'force' flag
    loadRate: rxMethod<{ fromCurr: string; toCurr: string; force?: boolean }>(
      pipe(
        tap(() => patchState(store, { isLoading: true })),
        mergeMap(({ fromCurr, toCurr }) =>
          rateService.getExchangeRate(fromCurr, toCurr).pipe(
            tapResponse({
              next: (data: ExchangeRate) => {
                const key = `${data.from}-${data.to}`;
                patchState(store, (state) => ({
                  isLoading: false,
                  rates: { ...state.rates, [key]: data.rate },
                  timestamps: { ...state.timestamps, [key]: new Date(data.updated_at).getTime() },
                }));
              },
              error: (error) => patchState(store, { isLoading: false, error }),
            }),
          ),
        ),
      ),
    ),
  })),
);