import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Album } from '../models/album';
import { api } from '../core/api';
import { apiRequest } from '../core/api-request';
import { ApiSuccessResponse } from '../core/api-repsonse';

@Injectable({
  providedIn: 'root',
})
export class AlbumService {
  // ===== CRUD Operations =====
  getAll(): Observable<Album[]> {
    return apiRequest<Album[]>(api.get('/albums'));
  }

  getById(id: string): Observable<Album> {
    return apiRequest<Album>(api.get(`/albums/${id}`));
  }

  getByTitle(name: string): Observable<Album[]> {
    return apiRequest<Album[]>(api.get(`/albums/title/${this.encode(name)}`));
  }

  getByRank(rank: string): Observable<Album[]> {
    return apiRequest<Album[]>(api.get(`/albums/rank/${rank}`));
  }

  getByBand(bandName: string): Observable<Album[]> {
    return apiRequest<Album[]>(
      api.get(`/albums/band/${this.encode(bandName)}`),
    );
  }

  create(album: Album): Observable<Album> {
    return apiRequest<Album>(api.post('/albums', album));
  }

  update(id: string, newData: Object): Observable<Album> {
    return apiRequest<Album>(api.put(`/albums/${id}`, newData));
  }

  delete(id: string): Observable<ApiSuccessResponse<void>> {
    return apiRequest<ApiSuccessResponse<void>>(api.delete(`/albums/${id}`));
  }

  // ===== Helper Methods =====
  encode(name: string) {
    return encodeURIComponent(name).replace(/'/g, '%27');
  }

  getBorderColor(rank: string): string {
    switch (rank) {
      case 'gold':
        return 'gold';
      case 'silver':
        return 'silver';
      case 'bronze':
        return '#cd7f32'; //bronze
      default:
        return '#777776ff';
    }
  }

  getProducersString(producers: string[]): string {
    if (!producers || producers.length === 0) {
      return 'Unknown';
    } else if (producers.length === 1) {
      return 'Producer: ' + producers[0];
    } else {
      return 'Producers: ' + producers.join(', ');
    }
  }
}
