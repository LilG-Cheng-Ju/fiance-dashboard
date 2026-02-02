import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface StockPriceResponse {
  ticker: string;
  price: number;
  currency: string;
}

export type PriceMap = Record<string, StockPriceResponse>;

@Injectable({
  providedIn: 'root'
})
export class MarketService {
  private http = inject(HttpClient);
  private readonly API_BASE = 'http://localhost:8000';

  /**
   * 批次查詢股價
   * @param targets [{ ticker: 'TSLA', region: 'US' }, { ticker: '2330', region: 'TW' }]
   */
  fetchBatchPrices(targets: { ticker: string, region: string }[]): Observable<PriceMap> {
    if (targets.length === 0) return of({});

    const requests = targets.map(target => 
      this.http.get<StockPriceResponse>(
        `${this.API_BASE}/market/stock/${target.ticker}`, 
        { params: { region: target.region } }
      ).pipe(
        catchError(err => {
          console.warn(`[MarketService] 查價失敗: ${target.ticker}`, err);
          return of(null); 
        })
      )
    );

    return forkJoin(requests).pipe(
      map(results => {
        const priceMap: PriceMap = {};
        results.forEach((res, index) => {
          if (res) {
            const originalTicker = targets[index].ticker;
            priceMap[originalTicker] = res;
          }
        });
        return priceMap;
      })
    );
  }
}