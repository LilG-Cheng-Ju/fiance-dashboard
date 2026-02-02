import { createAction, props } from '@ngrx/store';
import { PriceMap } from '../../services/market.service';

export const startTracking = createAction(
  '[Market] Start Tracking',
  props<{ symbols: { ticker: string, region: string }[] }>()
);

export const priceUpdated = createAction(
  '[Market] Price Updated',
  props<{ prices: PriceMap }>()
);

export const marketError = createAction(
  '[Market] Error',
  props<{ error: any }>()
);