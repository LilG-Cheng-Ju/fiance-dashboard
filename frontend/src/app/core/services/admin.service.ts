import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FriendCode } from '../models/friend-code.model';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);
  private readonly API_URL = '/api/admin/friend-codes';

  getFriendCodes(): Observable<FriendCode[]> {
    return this.http.get<FriendCode[]>(this.API_URL);
  }

  createFriendCodes(count: number): Observable<FriendCode[]> {
    return this.http.post<FriendCode[]>(this.API_URL, { count });
  }
}