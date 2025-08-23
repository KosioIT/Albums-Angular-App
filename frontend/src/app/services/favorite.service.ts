import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Album } from '../models/album';

@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private apiUrl = `${environment.apiUrl}/favorites`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`,
    });
  }

  add(albumId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${albumId}`, {}, {
      headers: this.getAuthHeaders(),
    });
  }

  remove(albumId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${albumId}`, {
      headers: this.getAuthHeaders(),
    });
  }

  getAll(): Observable<Album[]> {
    return this.http.get<Album[]>(this.apiUrl, {
      headers: this.getAuthHeaders(),
    });
  }
}
