import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExchangeRateResponse {
  from: string;
  to: string;
  rate: number;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class RateService {
  private http = inject(HttpClient);
  private readonly API_BASE = 'http://localhost:8000';

  getExchangeRate(fromCurr: string, toCurr: string): Observable<ExchangeRateResponse> {
    return this.http.get<ExchangeRateResponse>(`${this.API_BASE}/market/rate`, {
      params: { from_curr: fromCurr, to_curr: toCurr }
    });
  }
}