import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface AssetData {
  id: number;
  name: string;
  asset_type: string;
  currency: string;
  current_value: number;
  quantity: number;
  symbol: string;
  unit_price?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AssetService {
  private http = inject(HttpClient);
  private readonly API_URL = '/api/assets/';

  getAssets(): Observable<AssetData[]> {
    return this.http.get<AssetData[]>(this.API_URL);
  }
  
  // TODO: Implement other CRUD operations as needed
  addAsset(asset: Partial<AssetData>): Observable<AssetData> {
    return this.http.post<AssetData>(this.API_URL, asset);
  }

  deleteAsset(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}/`);
  }
}