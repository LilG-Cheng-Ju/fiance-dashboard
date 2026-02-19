import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { StockPrice } from '../models/market.model';

export type PriceMap = Record<string, StockPrice>;

@Injectable({
  providedIn: 'root',
})
export class MarketService {
  private http = inject(HttpClient);
  private readonly API_BASE = '/api/market';

  /**
   * batch fetch stock prices
   * @param targets [{ ticker: 'TSLA', region: 'US' }, { ticker: '2330', region: 'TW' }]
   */
  fetchBatchPrices(targets: { ticker: string; region: string }[]): Observable<PriceMap> {
    if (targets.length === 0) return of({});

    const requests = targets.map((target) =>
      this.http
        .get<StockPrice>(`${this.API_BASE}/stock/${target.ticker}`, {
          params: { region: target.region },
        })
        .pipe(
          catchError((err) => {
            console.warn(`[MarketService] 查價失敗: ${target.ticker}`, err);
            return of(null);
          }),
        ),
    );

    return forkJoin(requests).pipe(
      map((results) => {
        const priceMap: PriceMap = {};
        results.forEach((res, index) => {
          if (res) {
            const originalTicker = targets[index].ticker;
            priceMap[originalTicker] = res;
          }
        });
        return priceMap;
      }),
    );
  }
}
