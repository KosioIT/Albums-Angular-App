import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subject, distinctUntilChanged, map, skip } from 'rxjs';
import { Album } from '../models/album';
import { PreviewTrack } from '../models/preview-track';
import { AlbumService } from './album.service';
import { PlaylistService } from './playlist.service';
import { CustomToastrService } from './custom-toastr.service';
import { AuthService } from './auth.service';

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
  The built-in player: one <audio> element for the whole app, playing the songs of an album
  (or a playlist) one after another. Logged-in users hear the whole song when it is stored
  (fullUrl), everyone else the 30-second Deezer preview. The bar itself is PlayerComponent.
*/
@Injectable({ providedIn: 'root' })
export class PlayerService {
  private albumService = inject(AlbumService);
  private playlistService = inject(PlaylistService);
  private toastr = inject(CustomToastrService);
  private auth = inject(AuthService);

  // What is loaded: an album, or a playlist (tracks from many albums)
  readonly album = signal<Album | null>(null);
  readonly playlist = signal<{ id: string; name: string } | null>(null);
  readonly active = computed(() => !!this.album() || !!this.playlist());
  readonly tracks = signal<PreviewTrack[]>([]);
  readonly index = signal(0);
  readonly playing = signal(false);
  readonly loading = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(30);
  readonly full = signal(false); // the audio playing is the whole song, not the preview
  readonly volume = signal(savedVolume());
  readonly current = computed<PreviewTrack | null>(() => this.tracks()[this.index()] ?? null);

  // Fires when a listen was counted on the server, so a page can update its counter
  readonly listenCounted$ = new Subject<{ albumId: string; guest: boolean }>();

  private audio = new Audio();
  private request = 0; // ignores answers for an album the user already left
  private retried = false;
  private countedAlbums = new Set<string>(); // albums whose listen was sent for the current queue

  constructor() {
    this.audio.preload = 'auto';
    this.audio.volume = this.volume();
    this.audio.addEventListener('timeupdate', () => this.currentTime.set(this.audio.currentTime));
    this.audio.addEventListener('loadedmetadata', () => this.duration.set(this.audio.duration || 30));
    this.audio.addEventListener('play', () => this.playing.set(true));
    this.audio.addEventListener('pause', () => this.playing.set(false));
    this.audio.addEventListener('ended', () => this.next(true));
    this.audio.addEventListener('error', () => this.onAudioError());

    // Signing in or out changes which songs are whole: reload the queue that is playing
    this.auth.user$
      .pipe(
        map((user) => !!user),
        distinctUntilChanged(),
        skip(1),
      )
      .subscribe(() => this.reloadQueue());
  }

  isCurrent(album: Album): boolean {
    return this.album()?.id === album.id;
  }

  isCurrentPlaylist(id: string): boolean {
    return this.playlist()?.id === id;
  }

  // Starts an album; on the album that is already loaded it just plays / pauses
  playAlbum(album: Album): void {
    if (this.isCurrent(album) && this.tracks().length) {
      this.toggle();
      return;
    }

    const request = this.startQueue({ album });
    this.albumService.getPreviews(album.id).subscribe({
      next: ({ tracks }) => {
        if (request !== this.request) return;
        this.loading.set(false);
        this.tracks.set(this.withAlbum(tracks, album));
        this.playTrack(0);
      },
      error: (err: Error) => {
        if (request !== this.request) return;
        this.close();
        this.toastr.showToast(err.message, 'info', 'Cannot play this album');
      },
    });
  }

  // Starts a playlist (from a given track); on the playlist that is already loaded it plays / pauses
  playPlaylist(id: string, startAt = 0): void {
    if (this.isCurrentPlaylist(id) && this.tracks().length) {
      if (startAt === this.index()) this.toggle();
      else this.playTrack(startAt);
      return;
    }

    const request = this.startQueue({ playlist: { id, name: '' } });
    this.playlistService.previews(id).subscribe({
      next: ({ playlist, tracks }) => {
        if (request !== this.request) return;
        this.loading.set(false);
        if (!tracks.length) {
          this.close();
          this.toastr.showToast('This playlist has no tracks to play yet.', 'info', 'Empty playlist');
          return;
        }
        this.playlist.set({ id: playlist.id, name: playlist.name });
        this.tracks.set(tracks);
        this.playTrack(Math.min(startAt, tracks.length - 1));
      },
      error: (err: Error) => {
        if (request !== this.request) return;
        this.close();
        this.toastr.showToast(err.message, 'info', 'Cannot play this playlist');
      },
    });
  }

  private startQueue(source: { album?: Album; playlist?: { id: string; name: string } }): number {
    const request = ++this.request;
    this.stopAudio();
    this.album.set(source.album ?? null);
    this.playlist.set(source.playlist ?? null);
    this.tracks.set([]);
    this.index.set(0);
    this.loading.set(true);
    this.countedAlbums.clear();
    return request;
  }

  // Album previews do not repeat their album on every track; the player and playlists need it
  private withAlbum(tracks: PreviewTrack[], album: Album): PreviewTrack[] {
    return tracks.map((t) => ({
      ...t,
      albumId: album.id,
      albumTitle: album.title,
      artist: album.artist,
      cover_img_url: album.cover_img_url,
    }));
  }

  playTrack(i: number): void {
    const track = this.tracks()[i];
    if (!track) return;
    this.index.set(i);
    this.currentTime.set(0);
    this.duration.set(track.fullUrl ? track.duration : 30);
    this.full.set(!!track.fullUrl);
    this.audio.src = track.fullUrl ?? track.preview;
    this.audio.play().catch(() => this.playing.set(false)); // e.g. autoplay blocked: the user presses play
    if (track.albumId) this.countListen(track.albumId);
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
    this.playlist.set(null);
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

  // The current queue's tracks, fetched again (fresh links, whole songs or previews)
  private freshTracks(): Observable<PreviewTrack[]> {
    const album = this.album();
    return album
      ? this.albumService.getPreviews(album.id).pipe(map(({ tracks }) => this.withAlbum(tracks, album)))
      : this.playlistService.previews(this.playlist()!.id).pipe(map(({ tracks }) => tracks));
  }

  // Links expire after a while: fetch fresh ones once and continue with the same track
  private onAudioError(): void {
    if (!this.active() || !this.audio.getAttribute('src')) return;
    this.playing.set(false);
    if (this.retried) {
      this.toastr.showToast('This track cannot be played right now.', 'error', 'Playback error');
      return;
    }
    this.retried = true;
    const index = this.index();
    const request = this.request;
    this.freshTracks().subscribe({
      next: (tracks) => {
        if (request !== this.request) return;
        this.tracks.set(tracks);
        this.playTrack(Math.min(index, tracks.length - 1));
      },
    });
  }

  /*
    After signing in the next songs play whole (the current preview just goes on); after signing
    out a whole song that is playing switches to its preview, since guests only get previews.
  */
  private reloadQueue(): void {
    if (!this.active() || this.loading() || !this.tracks().length) return;
    const request = this.request;
    const current = this.current();
    this.freshTracks().subscribe({
      next: (tracks) => {
        if (request !== this.request || !tracks.length) return;
        const index = Math.max(0, tracks.findIndex((t) => t.id === current?.id && t.albumId === current?.albumId));
        const wasFull = this.full();
        const wasPlaying = this.playing();
        this.tracks.set(tracks);
        this.index.set(index);
        if (wasFull && !tracks[index].fullUrl) {
          if (wasPlaying) this.playTrack(index);
          else {
            this.audio.src = tracks[index].preview; // paused: play starts the preview
            this.currentTime.set(0);
            this.duration.set(30);
            this.full.set(false);
          }
        }
      },
      error: () => {
        // the queue could not be reloaded: at least do not keep playing whole songs to a guest
        if (request === this.request && !this.auth.isLoggedIn()) this.close();
      },
    });
  }

  // One listen per album in the current queue (an album, or each album a playlist plays from),
  // for members and guests alike; the server also ignores repeats within a minute
  private countListen(albumId: string): void {
    if (this.countedAlbums.has(albumId)) return;
    this.countedAlbums.add(albumId);
    this.albumService.listen(albumId).subscribe({
      next: ({ counted, guest }) => counted && this.listenCounted$.next({ albumId, guest }),
      error: () => {},
    });
  }
}
