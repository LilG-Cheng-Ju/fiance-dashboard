import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MarketState } from './market.reducer';

export const selectMarketState = createFeatureSelector<MarketState>('market');

export const selectPrices = createSelector(
  selectMarketState,
  (state) => state.prices
);