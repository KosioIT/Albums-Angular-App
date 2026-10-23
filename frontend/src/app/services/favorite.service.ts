import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Album } from '../models/album';
import { api } from '../core/api';
import { apiRequest } from '../core/api-request';
import { ApiSuccessResponse } from '../core/api-repsonse';

@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private apiUrl = `${environment.apiUrl}/favorites`;

  constructor() {}

  getAll(): Observable<Album[]> {
    return apiRequest<Album[]>(api.get(this.apiUrl));
  }

  add(albumId: string): Observable<ApiSuccessResponse<string[]>> {
    return apiRequest<ApiSuccessResponse<string[]>>(
      api.post(`/favorites/${albumId}`),
    );
  }

  remove(albumId: string): Observable<ApiSuccessResponse<string[]>> {
    return apiRequest<ApiSuccessResponse<string[]>>(
      api.delete(`/favorites/${albumId}`),
    );
  }
}
