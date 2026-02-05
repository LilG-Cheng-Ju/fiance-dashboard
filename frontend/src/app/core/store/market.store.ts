import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, timer, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { MarketService } from '../services/market.service';
import { StockPrice } from '../models/market.model';

// 1. [State] 定義狀態 (MarketState)
type MarketState = {
  prices: Record<string, StockPrice>; // { "TSLA": { price: 175... } }
  isLoading: boolean;
  error: any;
};

const initialState: MarketState = {
  prices: {},
  isLoading: false,
  error: null,
};

// 常數定義 (跟 Effect 一樣)
const FETCH_INTERVAL = 30000;

export const MarketStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  // 2. [Selectors]
  withComputed((store) => ({
    // 對應 selectPrices
    priceMap: computed(() => store.prices()),

    // (Optional) 方便 UI 判斷是否正在追蹤任何股票
    hasPrices: computed(() => Object.keys(store.prices()).length > 0),
  })),

  // 3. [Effects & Reducers]
  withMethods((store, marketService = inject(MarketService)) => ({
    // 這就是原本的 Effect + Action: startTracking
    startTracking: rxMethod<{ ticker: string; region: string }[]>(
      pipe(
        // Step A: 收到指令，先將 isLoading 設為 true
        tap(() => patchState(store, { isLoading: true, error: null })),

        // Step B: 處理 Polling 邏輯 (SwitchMap 確保舊的 Timer 會被取消)
        switchMap((symbols) => {
          // 處理空陣列情況 (對應 Effect 裡的 if length === 0)
          if (symbols.length === 0) {
            patchState(store, { isLoading: false });
            return of({}); // 結束這回合
          }

          // 啟動 Timer (0ms 開始, 每 30s 一次)
          return timer(0, FETCH_INTERVAL).pipe(
            // 呼叫 API
            switchMap(() =>
              marketService.fetchBatchPrices(symbols).pipe(
                tapResponse({
                  // [Reducer] 成功: 合併股價
                  next: (newPrices) =>
                    patchState(store, (state) => ({
                      prices: { ...state.prices, ...newPrices }, // 這裡保留了 Spread Operator 邏輯
                      isLoading: false,
                      error: null,
                    })),

                  // [Reducer] 失敗: 紀錄錯誤
                  error: (error) =>
                    patchState(store, {
                      isLoading: false,
                      error,
                    }),
                }),
              ),
            ),
          );
        }),
      ),
    ),
  })),
);
