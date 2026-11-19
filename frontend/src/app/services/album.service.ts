import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Album } from '../models/album';
import { PreviewTrack } from '../models/preview-track';
import { AlbumSongs, SongTarget, SongUpload } from '../models/album-songs';
import { guestId } from '../core/guest-id';
import { api } from '../core/api';
import { apiBody, apiRequest } from '../core/api-request';
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
    return apiRequest<Album>(api.get(`/albums/id/${this.encode(id)}`));
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

  // ===== Listens, likes, downloads (signed-in users) =====

  // Liking again removes the like
  toggleLike(id: string): Observable<{ liked: boolean; likes: number }> {
    return apiBody(api.post(`/albums/${this.encode(id)}/like`));
  }

  // Open to guests too (counted separately). counted = false for a repeat within a minute
  listen(id: string): Observable<{ counted: boolean; guest: boolean }> {
    return apiBody(api.post(`/albums/${this.encode(id)}/listen`, null, { headers: { 'X-Guest-Id': guestId() } }));
  }

  // Listens by members and guests together
  totalListens(album: Album): number {
    return (album.listens ?? 0) + (album.guestListens ?? 0);
  }

  // Counts the download and returns a one-minute link to the album's zip (served by Cloudflare R2).
  // The first download of an album packs its songs, which can take a while: a longer timeout
  download(id: string): Observable<{ url: string; counted: boolean }> {
    return apiBody(api.post(`/albums/${this.encode(id)}/download`, null, { timeout: 5 * 60 * 1000 }));
  }

  // One-minute link to one song (trackId = the Deezer track id from the previews)
  downloadTrack(albumId: string, trackId: number): Observable<{ url: string }> {
    return apiBody(api.post(`/albums/${this.encode(albumId)}/tracks/${trackId}/download`));
  }

  // ===== Song files (admins, the "Songs" page) =====
  songs(id: string): Observable<AlbumSongs> {
    return apiRequest(api.get(`/albums/${this.encode(id)}/songs`));
  }

  // Which chosen file is which song (by title), for the admin to check
  matchSongFiles(id: string, names: string[]): Observable<{ name: string; target: SongTarget | null }[]> {
    return apiRequest(api.post(`/albums/${this.encode(id)}/songs/match`, { names }));
  }

  // Upload links, one per file (the browser then sends the files straight to R2)
  createSongUploads(id: string, files: { name: string; size: number; target: SongTarget }[]): Observable<SongUpload[]> {
    return apiRequest(api.post(`/albums/${this.encode(id)}/songs/uploads`, { files }));
  }

  // Saves the uploaded files to the album
  completeSongUploads(id: string, files: { key: string; target: SongTarget }[]): Observable<AlbumSongs> {
    return apiRequest(api.post(`/albums/${this.encode(id)}/songs/complete`, { files }, { timeout: 60 * 1000 }));
  }

  removeSong(id: string, target: SongTarget): Observable<AlbumSongs> {
    return apiRequest(api.delete(`/albums/${this.encode(id)}/songs/${target}`));
  }

  // 30-second Deezer previews for the built-in player (public)
  getPreviews(id: string): Observable<{ deezerAlbumId: number; tracks: PreviewTrack[] }> {
    return apiRequest(api.get(`/albums/${this.encode(id)}/previews`));
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
