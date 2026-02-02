import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { RateService } from '../../services/exchange_rate.service';
import * as RateActions from './exchange_rate.actions';
import { switchMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable()
export class RateEffects {
  private actions$ = inject(Actions);
  private rateService = inject(RateService);

  loadRate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(RateActions.loadRate),
      switchMap(({ fromCurr, toCurr }) =>
        this.rateService.getExchangeRate(fromCurr, toCurr).pipe(
          map(data => RateActions.loadRateSuccess({ data })),
          catchError(error => of(RateActions.loadRateFailure({ error })))
        )
      )
    )
  );
}