import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { api } from '../core/api';
import { apiRequest } from '../core/api-request';
import { Playlist, PlaylistPreviews, PlaylistTrack } from '../models/playlist';

@Injectable({ providedIn: 'root' })
export class PlaylistService {
  private url = (id: string) => `/playlists/${encodeURIComponent(id)}`;

  listPublic(): Observable<Playlist[]> {
    return apiRequest<Playlist[]>(api.get('/playlists/public'));
  }

  listMine(): Observable<Playlist[]> {
    return apiRequest<Playlist[]>(api.get('/playlists/mine'));
  }

  get(id: string): Observable<Playlist> {
    return apiRequest<Playlist>(api.get(this.url(id)));
  }

  previews(id: string): Observable<PlaylistPreviews> {
    return apiRequest<PlaylistPreviews>(api.get(`${this.url(id)}/previews`));
  }

  create(name: string, isPublic = false, description = ''): Observable<Playlist> {
    return apiRequest<Playlist>(api.post('/playlists', { name, isPublic, description }));
  }

  update(id: string, changes: Partial<Pick<Playlist, 'name' | 'description' | 'isPublic'>>): Observable<Playlist> {
    return apiRequest<Playlist>(api.patch(this.url(id), changes));
  }

  delete(id: string): Observable<null> {
    return apiRequest<null>(api.delete(this.url(id)));
  }

  addTrack(id: string, albumId: string, trackId: number): Observable<PlaylistTrack> {
    return apiRequest<PlaylistTrack>(api.post(`${this.url(id)}/tracks`, { albumId, trackId }));
  }

  removeTrack(id: string, trackId: number): Observable<Playlist> {
    return apiRequest<Playlist>(api.delete(`${this.url(id)}/tracks/${trackId}`));
  }

  reorder(id: string, order: number[]): Observable<Playlist> {
    return apiRequest<Playlist>(api.put(`${this.url(id)}/tracks/order`, { order }));
  }
}

// "1 h 12 min" / "18 min" / "3:41"
export function formatDuration(seconds: number, long = false): string {
  const s = Math.max(0, Math.round(seconds || 0));
  if (!long) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}
