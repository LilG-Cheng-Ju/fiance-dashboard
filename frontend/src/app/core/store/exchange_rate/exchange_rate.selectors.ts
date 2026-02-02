// src/app/store/rate/rate.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RateState } from './exchange_rate.reducer';

export const selectRateState = createFeatureSelector<RateState>('rate');

export const selectRateMap = createSelector(
  selectRateState,
  (state) => state.rates
);

export const selectRateTimestamps = createSelector(
  selectRateState,
  (state) => state.timestamps
);