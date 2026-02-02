import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AssetState } from './asset.reducer';

export const selectAssetState = createFeatureSelector<AssetState>('asset');

// 2. 選取資產清單
export const selectAssets = createSelector(
  selectAssetState,
  (state) => state.assets
);

// 3. 選取是否讀取中 (可用來顯示 Loading Spinner)
export const selectAssetLoading = createSelector(
  selectAssetState,
  (state) => state.isLoading
);