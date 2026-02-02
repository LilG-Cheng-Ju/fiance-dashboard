import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MarketService } from '../../services/market.service';
import * as MarketActions from './market.actions';
import { switchMap, map, catchError } from 'rxjs/operators';
import { timer, of } from 'rxjs';

const FETCH_INTERVAL = 30000;

@Injectable()
export class MarketEffects {
  private actions$ = inject(Actions);
  private marketService = inject(MarketService);

  pollPrices$ = createEffect(() => 
    this.actions$.pipe(
      ofType(MarketActions.startTracking),
      
      switchMap(action => {
        if (action.symbols.length === 0) return of(MarketActions.priceUpdated({ prices: {} }));

        return timer(0, FETCH_INTERVAL).pipe(
          switchMap(() => 
            this.marketService.fetchBatchPrices(action.symbols).pipe(
              map(prices => MarketActions.priceUpdated({ prices })),
              catchError(error => of(MarketActions.marketError({ error })))
            )
          )
        );
      })
    )
  );
}