import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Asset, AssetCreate } from '../models/asset.model';

@Injectable({
  providedIn: 'root',
})
export class AssetService {
  private http = inject(HttpClient);
  private readonly API_URL = '/api/assets/';

  getAssets(): Observable<Asset[]> {
    return this.http.get<Asset[]>(this.API_URL);
  }

  // TODO: Implement other CRUD operations as needed
  addAsset(asset: AssetCreate): Observable<Asset> {
    return this.http.post<Asset>(this.API_URL, asset);
  }

  deleteAsset(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}/`);
  }
}
