import { createAction, props } from '@ngrx/store';
import { ExchangeRateResponse } from '../../services/exchange_rate.service';

export const loadRate = createAction(
  '[Rate] Load Rate',
  props<{ fromCurr: string, toCurr: string }>()
);

export const loadRateSuccess = createAction(
  '[Rate] Load Success',
  props<{ data: ExchangeRateResponse }>()
);

export const loadRateFailure = createAction(
  '[Rate] Load Failure',
  props<{ error: any }>()
);