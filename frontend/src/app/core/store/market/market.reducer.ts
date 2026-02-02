import { createReducer, on } from '@ngrx/store';
import * as MarketActions from './market.actions';
import { PriceMap } from '../../services/market.service';

export interface MarketState {
  prices: PriceMap; // 核心資料：{ "TSLA": { price: 175... } }
  isLoading: boolean;
}

export const initialState: MarketState = {
  prices: {},
  isLoading: false
};

export const marketReducer = createReducer(
  initialState,

  on(MarketActions.startTracking, (state) => ({
    ...state,
    isLoading: true
  })),

  on(MarketActions.priceUpdated, (state, { prices }) => ({
    ...state,
    // 這裡我們用 spread operator 合併新舊股價 (這樣如果只查部分，舊的還會在)
    prices: { ...state.prices, ...prices }, 
    isLoading: false
  })),

  on(MarketActions.marketError, (state) => ({
    ...state,
    isLoading: false
  }))
);