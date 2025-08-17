import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment as env } from '../../environments/environment';
import { Album } from '../models/album';

@Injectable({
  providedIn: 'root',
})
export class AlbumService {
  private baseUrl = `${env.apiUrl}/albums`;

  constructor(private http: HttpClient) {}

  encode(name: string) {
    return encodeURIComponent(name);
  }

  getAll(): Observable<Album[]> {
    return this.http.get<Album[]>(this.baseUrl);
  }

  getById(id: string): Observable<Album> {
    return this.http.get<Album>(`${this.baseUrl}/${id}`);
  }

  getByRank(rank: string): Observable<Album[]> {
    return this.getAll().pipe(
      map((albums) => albums.filter((album) => album.rank === rank))
    );
  }

  getByBand(bandName: string): Observable<Album[]> {
    return this.getAll().pipe(
      map((albums) =>
        albums.filter(
          (album) => album.artist.toLowerCase() === bandName.toLowerCase()
        )
      )
    );
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
    if (producers.length === 0) {
      return 'Unknown';
    } else if (producers.length === 1) {
      return 'Producer: ' + producers[0];
    } else {
      return 'Producers: ' + producers.join(', ');
    }
  }

  create(album: Album): Observable<Album> {
    return this.http.post<Album>(this.baseUrl, album);
  }

  update(id: string, album: Album): Observable<Album> {
    return this.http.put<Album>(`${this.baseUrl}/${id}`, album);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }
}
