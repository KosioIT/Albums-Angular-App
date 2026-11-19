import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { PlayerService } from '../../services/player.service';
import { AuthService } from '../../services/auth.service';
import { PlaylistService } from '../../services/playlist.service';
import { AlbumService } from '../../services/album.service';
import { CustomToastrService } from '../../services/custom-toastr.service';
import { Playlist } from '../../models/playlist';
import { PreviewTrack } from '../../models/preview-track';

// "m:ss" from seconds
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// The player bar at the bottom of every page (shown while an album is loaded)
@Component({
  selector: 'app-player',
  imports: [FormsModule],
  templateUrl: './player.component.html',
  styleUrl: './player.component.css',
})
export class PlayerComponent {
  readonly player = inject(PlayerService);
  readonly auth = inject(AuthService);
  private playlists = inject(PlaylistService);
  private albums = inject(AlbumService);
  private toastr = inject(CustomToastrService);
  readonly formatTime = formatTime;
  showTracks = false;

  // "+" on a track: which row's playlist picker is open, and the user's playlists (null = loading)
  addingFor: number | null = null;
  readonly myPlaylists = signal<Playlist[] | null>(null);
  newName = '';
  busy = false;

  constructor() {
    // The track list floats over the page: close it when the user goes to another page
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        this.showTracks = false;
        this.addingFor = null;
      });
  }

  toggleAdd(index: number): void {
    this.addingFor = this.addingFor === index ? null : index;
    this.newName = '';
    if (this.addingFor !== null) {
      this.myPlaylists.set(null);
      this.playlists.listMine().subscribe({
        next: (list) => this.myPlaylists.set(list),
        error: (err: Error) => {
          this.addingFor = null;
          this.toastr.showToast(err.message, 'error', 'Could not load your playlists');
        },
      });
    }
  }

  addTo(playlistId: string, name: string, track: PreviewTrack): void {
    if (this.busy || !track.albumId) return;
    this.busy = true;
    this.playlists.addTrack(playlistId, track.albumId, track.id).subscribe({
      next: () => {
        this.busy = false;
        this.addingFor = null;
        this.toastr.showToast(`"${track.title}" was added to "${name}".`, 'success', 'Added to playlist');
      },
      error: (err: Error) => {
        this.busy = false;
        this.toastr.showToast(err.message, 'info', 'Not added');
      },
    });
  }

  createAndAdd(event: Event, track: PreviewTrack): void {
    event.preventDefault();
    const name = this.newName.trim();
    if (!name || this.busy) return;
    this.busy = true;
    this.playlists.create(name).subscribe({
      next: (pl) => {
        this.busy = false;
        this.addTo(pl.id, pl.name, track);
      },
      error: (err: Error) => {
        this.busy = false;
        this.toastr.showToast(err.message, 'error', 'Could not create the playlist');
      },
    });
  }

  onSeek(event: Event): void {
    this.player.seek((event.target as HTMLInputElement).valueAsNumber);
  }

  onVolume(event: Event): void {
    this.player.setVolume((event.target as HTMLInputElement).valueAsNumber);
  }

  toggleMute(): void {
    this.player.setVolume(this.player.volume() > 0 ? 0 : 0.8);
  }

  pick(index: number): void {
    this.player.playTrack(index);
  }

  // One song as a file (the link answers with "attachment": the page and the music keep going)
  downloading: number | null = null;
  downloadTrack(track: PreviewTrack, index: number): void {
    if (!track.albumId || this.downloading !== null) return;
    this.downloading = index;
    this.albums.downloadTrack(track.albumId, track.id).subscribe({
      next: ({ url }) => {
        this.downloading = null;
        const a = document.createElement('a'); // not location.assign: the player must not be interrupted
        a.href = url;
        a.click();
      },
      error: (err: Error) => {
        this.downloading = null;
        this.toastr.showToast(err.message, 'error', 'Download failed');
      },
    });
  }

  // Space plays / pauses, unless the user is typing somewhere
  // Esc closes the track list (and the playlist picker in it)
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.addingFor !== null) this.addingFor = null;
    else this.showTracks = false;
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.code !== 'Space' || !this.player.album()) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
    event.preventDefault();
    this.player.toggle();
  }
}
