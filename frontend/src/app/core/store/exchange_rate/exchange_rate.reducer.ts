import { createReducer, on } from '@ngrx/store';
import * as RateActions from './exchange_rate.actions';

export interface RateState {
  rates: Record<string, number>;
  isLoading: boolean;
  timestamps: Record<string, number>;
  error: any;
}

export const initialState: RateState = {
  rates: {},
  isLoading: false,
  timestamps: {},
  error: null
};

export const rateReducer = createReducer(
  initialState,

  on(RateActions.loadRate, (state) => ({ ...state, isLoading: true })),

  on(RateActions.loadRateSuccess, (state, { data }) => {
    const key = `${data.from}-${data.to}`;

    return {
      ...state,
      rates: {
        ...state.rates,
        [key]: data.rate
      },
      timestamps: {
        ...state.timestamps,
        [key]: new Date(data.updated_at).getTime()
      },
      isLoading: false
    };
  }),

  on(RateActions.loadRateFailure, (state, { error }) => ({ 
    ...state, 
    isLoading: false, 
    error 
  }))
);