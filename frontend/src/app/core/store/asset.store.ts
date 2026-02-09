import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
  withHooks,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe } from 'rxjs';
import { switchMap, tap, mergeMap, finalize } from 'rxjs/operators';

import { AssetService } from '../services/asset.service';
import { Asset, AssetCreate, AssetStatus } from '../models/asset.model';

// 1. 定義 State 的形狀
type AssetState = {
  assets: Asset[];
  isLoading: boolean;
  error: string | null; // 簡化 error type 為 string，方便顯示
};

const initialState: AssetState = {
  assets: [],
  isLoading: false,
  error: null,
};

export const AssetStore = signalStore(
  { providedIn: 'root' }, // 全域單例，隨處可注入

  // 2. 初始化狀態
  withState(initialState),

  // 3. Computed Signals (類似 Selectors，會自動緩存)
  withComputed(({ assets }) => ({
    // 取得所有「活躍中」的資產 (過濾掉已歸檔/賣光的)
    activeAssets: computed(() => assets().filter((a) => a.status === AssetStatus.ACTIVE)),

    // 取得「已歸檔」的資產 (歷史紀錄)
    archivedAssets: computed(() => assets().filter((a) => a.status === AssetStatus.ARCHIVED)),

    // 計算「帳面總成本」 (Total Book Value)
    // 注意：這是成本，不是市值。市值的計算我們之後會在 Component 或 ViewModel 做。
    totalCostBasis: computed(() =>
      assets()
        .filter((a) => a.include_in_net_worth && a.status === AssetStatus.ACTIVE)
        .reduce((sum, asset) => sum + asset.book_value, 0),
    ),

    // 判斷是否為空
    hasAssets: computed(() => assets().length > 0),
  })),

  // 4. Methods (包含異步 API 呼叫與狀態更新)
  withMethods((store, assetService = inject(AssetService)) => ({
    // --- Load (讀取) ---
    loadAssets: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          assetService.getAssets().pipe(
            tapResponse({
              next: (assets) =>
                patchState(store, {
                  assets,
                  isLoading: false,
                }),
              error: (err: any) =>
                patchState(store, {
                  isLoading: false,
                  error: err?.message || 'Failed to load assets',
                }),
            }),
          ),
        ),
      ),
    ),

    // --- Add (新增) ---
    addAsset: rxMethod<AssetCreate>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((newAssetData) =>
          assetService.addAsset(newAssetData).pipe(
            tapResponse({
              next: (newAsset) =>
                patchState(store, (state) => ({
                  // 將新資產加入陣列
                  assets: [...state.assets, newAsset],
                  isLoading: false,
                })),
              error: (err: any) =>
                patchState(store, {
                  isLoading: false,
                  error: err?.message || 'Failed to add asset',
                }),
            }),
          ),
        ),
      ),
    ),

    // --- Delete (刪除) ---
    deleteAsset: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        mergeMap((id) =>
          assetService.deleteAsset(id).pipe(
            tapResponse({
              next: () =>
                patchState(store, (state) => ({
                  // 從陣列中移除該 ID
                  assets: state.assets.filter((a) => a.id !== id),
                  isLoading: false,
                })),
              error: (err: any) =>
                patchState(store, {
                  isLoading: false,
                  error: err?.message || 'Failed to delete asset',
                }),
            }),
          ),
        ),
      ),
    ),
  })),

  withHooks({
    onInit: (store) => {
      store.loadAssets();
      console.log('[AssetStore] Initialized & loading assets...');
    },
  }),
);
