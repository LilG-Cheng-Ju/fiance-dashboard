import { createReducer, on } from '@ngrx/store';
import * as AssetActions from './asset.actions';
import { AssetData } from '../../services/asset.service';

export interface AssetState {
  assets: AssetData[];
  isLoading: boolean;
  error: any;
}

export const initialState: AssetState = {
  assets: [],
  isLoading: false,
  error: null
};

export const assetReducer = createReducer(
  initialState,

  on(AssetActions.loadAssets, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),

  on(AssetActions.loadAssetsSuccess, (state, { assets }) => ({
    ...state,
    assets: assets,
    isLoading: false
  })),

  on(AssetActions.loadAssetsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error: error
  })),

  on(AssetActions.deleteAssetSuccess, (state, { id }) => ({
    ...state,
    assets: state.assets.filter(a => a.id !== id)
  }))
);