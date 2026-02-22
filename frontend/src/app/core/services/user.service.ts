import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { User, UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private http = inject(HttpClient);
  private readonly API_URL = '/api/users';

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/me`);
  }

  getUsers(
    skip: number = 0,
    limit: number = 20,
    query?: string,
    role?: UserRole,
    sortBy: string = 'created_at',
    order: 'asc' | 'desc' = 'desc'
  ): Observable<User[]> {
    let params = new HttpParams()
      .set('skip', skip)
      .set('limit', limit)
      .set('sort_by', sortBy)
      .set('order', order);

    if (query) {
      params = params.set('q', query);
    }
    if (role) {
      params = params.set('role', role);
    }

    return this.http.get<User[]>(this.API_URL, { params });
  }

  updateUserRole(uid: string, role: UserRole): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/${uid}/role`, { role });
  }

  deleteUser(uid: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${uid}`);
  }
}