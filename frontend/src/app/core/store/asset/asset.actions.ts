import { createAction, props } from '@ngrx/store';
import { AssetData } from '../../services/asset.service';

export const loadAssets = createAction('[Asset] Load Assets');
export const loadAssetsSuccess = createAction('[Asset] Load Success', props<{ assets: AssetData[] }>());
export const loadAssetsFailure = createAction('[Asset] Load Failure', props<{ error: any }>());

export const deleteAsset = createAction('[Asset] Delete', props<{ id: number }>());
export const deleteAssetSuccess = createAction('[Asset] Delete Success', props<{ id: number }>());
export const deleteAssetFailure = createAction('[Asset] Delete Failure', props<{ error: any }>());