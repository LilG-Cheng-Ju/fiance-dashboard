import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExchangeRate } from '../models/market.model';

@Injectable({
  providedIn: 'root'
})
export class RateService {
  private http = inject(HttpClient);
  private readonly API_BASE = 'http://localhost:8000';

  getExchangeRate(fromCurr: string, toCurr: string): Observable<ExchangeRate> {
    return this.http.get<ExchangeRate>(`${this.API_BASE}/market/rate`, {
      params: { from_curr: fromCurr, to_curr: toCurr }
    });
  }
}