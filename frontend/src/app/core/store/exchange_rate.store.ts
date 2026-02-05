import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe } from 'rxjs';
import { tap, mergeMap } from 'rxjs/operators';

import { RateService } from '../services/exchange_rate.service';
import { ExchangeRate } from '../models/market.model';

// 1. [State] 定義狀態結構 (對應 RateState)
type RateState = {
  rates: Record<string, number>; // ex: "USD-TWD": 32.5
  timestamps: Record<string, number>; // ex: "USD-TWD": 1708...
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

  // 2. [Selectors] 轉換為 Computed Signals
  withComputed((store) => ({
    rateMap: computed(() => store.rates()),

    rateTimestamps: computed(() => store.timestamps()),

    // (Optional) 為了方便除錯或顯示，保留 isLoading 的 computed
    loading: computed(() => store.isLoading()),
  })),

  // 3. [Actions + Effects + Reducer]
  withMethods((store, rateService = inject(RateService)) => ({
    // Action: loadRate
    loadRate: rxMethod<{ fromCurr: string; toCurr: string }>(
      pipe(
        // Reducer: isLoading = true
        tap(() => patchState(store, { isLoading: true })),

        // Effect: 呼叫 Service
        // 使用 mergeMap 以支援同時查詢多個匯率 (例如同時查 USD 和 JPY)
        mergeMap(({ fromCurr, toCurr }) =>
          rateService.getExchangeRate(fromCurr, toCurr).pipe(
            tapResponse({
              // Reducer: Load Success
              next: (data: ExchangeRate) => {
                // 邏輯復刻: 組合 Key "USD-TWD"
                const key = `${data.from}-${data.to}`;

                patchState(store, (state) => ({
                  isLoading: false,
                  // 更新 rates map
                  rates: {
                    ...state.rates,
                    [key]: data.rate,
                  },
                  // 更新 timestamps map
                  timestamps: {
                    ...state.timestamps,
                    [key]: new Date(data.updated_at).getTime(),
                  },
                }));
              },

              // Reducer: Load Failure
              error: (error) =>
                patchState(store, {
                  isLoading: false,
                  error,
                }),
            }),
          ),
        ),
      ),
    ),
  })),
);
