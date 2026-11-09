import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Observable, finalize } from 'rxjs';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { Album } from '../../models/album';
import { AlbumService } from '../../services/album.service';
import { AuthService } from '../../services/auth.service';
import { CustomToastrService } from '../../services/custom-toastr.service';
import { FavoritesTemplateComponent } from '../favorites/favorites-template/favorites-template.component';

@Component({
  selector: 'app-albums-list',
  imports: [RouterModule, FavoritesTemplateComponent, DecimalPipe],
  templateUrl: './albums-list.component.html',
  styleUrls: ['./albums-list.component.css', '../../styles/albums-list.css'],
})
export class AlbumsListComponent implements OnInit {
  albums: Album[] = [];
  isLoggedIn = false;
  hasMoreAlbums = false;
  band: string = '';

  showPlaylistSelector: boolean = false;
  albumToAdd!: Album;
  selectedPlaylistId: string = '';

  busy = new Set<string>(); // "<albumId>:<action>" while a request runs

  constructor(
    public albumService: AlbumService,
    public authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: CustomToastrService,
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();

    this.route.queryParams.subscribe((params) => {
      this.band = params['band'] ? decodeURIComponent(params['band']) : '';

      if (!this.band || this.band === '') {
        throw new Error('No band name provided!');
      }
      this.albumService.getByBand(this.band).subscribe({
        next: (data) => {
          if (this.isLoggedIn) {
            this.albums = data;
          } else {
            this.albums = data.slice(0, 6);
            this.hasMoreAlbums = data.length > 6;
          }
        },
        error: (err) => console.error(err),
      });
    });
  }

  // ===== Listen / like / download =====

  isBusy(album: Album, action: string): boolean {
    return this.busy.has(`${album.id}:${action}`);
  }

  // Guests are sent to sign in and come back here afterwards
  private requireLogin(action: string): boolean {
    if (this.authService.isLoggedIn()) return true;
    this.toastr.showToast(`Sign in to ${action} albums.`, 'info', 'Sign in required');
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    return false;
  }

  private run<T>(album: Album, action: string, request: Observable<T>, onDone: (res: T) => void, onError?: () => void): void {
    const key = `${album.id}:${action}`;
    if (this.busy.has(key)) return;
    this.busy.add(key);
    request.pipe(finalize(() => this.busy.delete(key))).subscribe({
      next: onDone,
      error: (err: Error) => {
        onError?.();
        this.toastr.showToast(err.message, 'error', 'Something went wrong');
      },
    });
  }

  toggleLike(album: Album): void {
    if (!this.requireLogin('like')) return;
    this.run(album, 'like', this.albumService.toggleLike(album.id), ({ liked, likes }) => {
      album.likes = likes;
      this.authService.setLiked(album.id, liked);
    });
  }

  // Opens the album on YouTube and counts the listen
  listen(album: Album): void {
    if (!this.requireLogin('listen to')) return;
    window.open(this.albumService.listenUrl(album), '_blank', 'noopener');
    this.run(album, 'listen', this.albumService.listen(album.id), ({ counted }) => {
      if (counted) album.listens = (album.listens ?? 0) + 1;
    });
  }

  download(album: Album): void {
    if (!this.requireLogin('download')) return;
    // Opened right away (during the click), otherwise the browser blocks it as a pop-up
    const tab = window.open('', '_blank');
    this.run(
      album,
      'download',
      this.albumService.download(album.id),
      ({ url, counted }) => {
        if (tab) {
          tab.opener = null;
          tab.location.href = url;
        } else {
          window.location.href = url;
        }
        if (counted) album.downloads = (album.downloads ?? 0) + 1;
      },
      () => tab?.close(),
    );
  }
}
