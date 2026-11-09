import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Album } from '../models/album';
import { PreviewTrack } from '../models/preview-track';
import { AlbumService } from './album.service';
import { AuthService } from './auth.service';
import { CustomToastrService } from './custom-toastr.service';

const VOLUME_KEY = 'player.volume';

function savedVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.8;
  } catch {
    return 0.8;
  }
}

/*
  The built-in player: one <audio> element for the whole app, playing the 30-second Deezer
  previews of an album one after another. The bar itself is PlayerComponent.
*/
@Injectable({ providedIn: 'root' })
export class PlayerService {
  private albumService = inject(AlbumService);
  private authService = inject(AuthService);
  private toastr = inject(CustomToastrService);

  readonly album = signal<Album | null>(null);
  readonly tracks = signal<PreviewTrack[]>([]);
  readonly index = signal(0);
  readonly playing = signal(false);
  readonly loading = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(30);
  readonly volume = signal(savedVolume());
  readonly current = computed<PreviewTrack | null>(() => this.tracks()[this.index()] ?? null);

  // Fires when a listen was counted on the server, so a page can update its counter
  readonly listenCounted$ = new Subject<string>();

  private audio = new Audio();
  private request = 0; // ignores answers for an album the user already left
  private retried = false;

  constructor() {
    this.audio.preload = 'auto';
    this.audio.volume = this.volume();
    this.audio.addEventListener('timeupdate', () => this.currentTime.set(this.audio.currentTime));
    this.audio.addEventListener('loadedmetadata', () => this.duration.set(this.audio.duration || 30));
    this.audio.addEventListener('play', () => this.playing.set(true));
    this.audio.addEventListener('pause', () => this.playing.set(false));
    this.audio.addEventListener('ended', () => this.next(true));
    this.audio.addEventListener('error', () => this.onAudioError());
  }

  isCurrent(album: Album): boolean {
    return this.album()?.id === album.id;
  }

  // Starts an album; on the album that is already loaded it just plays / pauses
  playAlbum(album: Album): void {
    if (this.isCurrent(album) && this.tracks().length) {
      this.toggle();
      return;
    }

    const request = ++this.request;
    this.stopAudio();
    this.album.set(album);
    this.tracks.set([]);
    this.index.set(0);
    this.loading.set(true);

    this.albumService.getPreviews(album.id).subscribe({
      next: ({ tracks }) => {
        if (request !== this.request) return;
        this.loading.set(false);
        this.tracks.set(tracks);
        this.playTrack(0);
        this.countListen(album);
      },
      error: (err: Error) => {
        if (request !== this.request) return;
        this.loading.set(false);
        this.album.set(null);
        this.toastr.showToast(err.message, 'info', 'Cannot play this album');
      },
    });
  }

  playTrack(i: number): void {
    const track = this.tracks()[i];
    if (!track) return;
    this.index.set(i);
    this.currentTime.set(0);
    this.duration.set(30);
    this.audio.src = track.preview;
    this.audio.play().catch(() => this.playing.set(false)); // e.g. autoplay blocked: the user presses play
  }

  toggle(): void {
    if (!this.current()) return;
    if (this.audio.paused) this.audio.play().catch(() => {});
    else this.audio.pause();
  }

  // auto = called when a preview ended; at the end of the album it stops instead of wrapping around
  next(auto = false): void {
    if (this.index() < this.tracks().length - 1) this.playTrack(this.index() + 1);
    else if (auto) {
      this.audio.currentTime = 0;
      this.playing.set(false);
    }
  }

  // Like most players: back to the start of the track, or to the previous one when near the start
  prev(): void {
    if (this.audio.currentTime > 3 || this.index() === 0) this.seek(0);
    else this.playTrack(this.index() - 1);
  }

  seek(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    this.audio.currentTime = seconds;
    this.currentTime.set(seconds);
  }

  setVolume(volume: number): void {
    const v = Math.min(1, Math.max(0, volume));
    this.audio.volume = v;
    this.volume.set(v);
    try {
      localStorage.setItem(VOLUME_KEY, String(v));
    } catch {
      /* private mode: the volume is just not remembered */
    }
  }

  close(): void {
    this.request++;
    this.stopAudio();
    this.album.set(null);
    this.tracks.set([]);
    this.loading.set(false);
  }

  private stopAudio(): void {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.playing.set(false);
    this.retried = false;
  }

  // Preview links expire after a while: fetch fresh ones once and continue with the same track
  private onAudioError(): void {
    const album = this.album();
    if (!album || !this.audio.getAttribute('src')) return;
    this.playing.set(false);
    if (this.retried) {
      this.toastr.showToast('This preview cannot be played right now.', 'error', 'Playback error');
      return;
    }
    this.retried = true;
    const index = this.index();
    this.albumService.getPreviews(album.id).subscribe({
      next: ({ tracks }) => {
        if (!this.isCurrent(album)) return;
        this.tracks.set(tracks);
        this.playTrack(Math.min(index, tracks.length - 1));
      },
    });
  }

  // One listen per album start, for signed-in users (the server ignores repeats within a minute)
  private countListen(album: Album): void {
    if (!this.authService.isLoggedIn()) return;
    this.albumService.listen(album.id).subscribe({
      next: ({ counted }) => counted && this.listenCounted$.next(album.id),
      error: () => {},
    });
  }
}
