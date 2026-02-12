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
import { switchMap, tap, mergeMap, take } from 'rxjs/operators';

import { AssetService } from '../services/asset.service';
import { Asset, AssetCreate, AssetStatus, AssetType } from '../models/asset.model';

type AssetState = {
  assets: Asset[];
  isLoading: boolean;
  error: string | null;
};

const initialState: AssetState = {
  assets: [],
  isLoading: false,
  error: null,
};

export const AssetStore = signalStore(
  { providedIn: 'root' },

  withState(initialState),

  // Computed Signals
  withComputed(({ assets }) => {
    
    // Helper: Get all 'ACTIVE' assets
    const activeAssets = computed(() => assets().filter((a) => a.status === AssetStatus.ACTIVE));

    return {
      activeAssets,

      // Get 'ARCHIVED' assets
      archivedAssets: computed(() => assets().filter((a) => a.status === AssetStatus.ARCHIVED)),

      // --- Filtered Assets (For Dropdowns & Dashboard) ---
      cashAssets: computed(() => 
        activeAssets().filter(a => a.asset_type === AssetType.CASH)
      ),
      stockAssets: computed(() => 
        activeAssets().filter(a => a.asset_type === AssetType.STOCK)
      ),
      cryptoAssets: computed(() => 
        activeAssets().filter(a => a.asset_type === AssetType.CRYPTO)
      ),
      goldAssets: computed(() => 
        activeAssets().filter(a => a.asset_type === AssetType.GOLD)
      ),
      liabilityAssets: computed(() => 
        activeAssets().filter(a => [AssetType.LIABILITY, AssetType.CREDIT_CARD].includes(a.asset_type))
      ),
      pendingAssets: computed(() => 
        activeAssets().filter(a => a.asset_type === AssetType.PENDING)
      ),
      // ---------------------------------------------------

      // Calculate 'Total Book Value' (Your original logic)
      totalCostBasis: computed(() =>
        assets()
          .filter((a) => a.include_in_net_worth && a.status === AssetStatus.ACTIVE)
          .reduce((sum, asset) => sum + asset.book_value, 0),
      ),

      hasAssets: computed(() => assets().length > 0),
    };
  }),

  // Methods
  withMethods((store, assetService = inject(AssetService)) => ({
    
    // Load Assets
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

    // Add Asset
    addAsset: rxMethod<AssetCreate>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((newAssetData) =>
          assetService.addAsset(newAssetData).pipe(
            tapResponse({
              next: (newAsset) => {
                // Logic: If linked transaction, we must refresh data to update the source account balance
                if (newAssetData.source_asset_id) {
                    // FIX: Directly call service here instead of store.loadAssets() to avoid type inference circle
                    assetService.getAssets().pipe(take(1)).subscribe({
                        next: (assets) => patchState(store, { assets, isLoading: false }),
                        error: (err) => patchState(store, { isLoading: false, error: err?.message })
                    });
                } else {
                    // Standard update: append to list
                    patchState(store, (state) => ({
                        assets: [...state.assets, newAsset],
                        isLoading: false,
                    }));
                }
              },
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

    // Delete Asset
    deleteAsset: rxMethod<number>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        mergeMap((id) =>
          assetService.deleteAsset(id).pipe(
            tapResponse({
              next: () =>
                patchState(store, (state) => ({
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