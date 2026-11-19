import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PlaylistService, formatDuration } from '../../../services/playlist.service';
import { PlayerService } from '../../../services/player.service';
import { AuthService } from '../../../services/auth.service';
import { AlbumService } from '../../../services/album.service';
import { CustomToastrService } from '../../../services/custom-toastr.service';
import { Playlist } from '../../../models/playlist';

// One playlist: play it, and (for its owner) edit, reorder and delete
@Component({
  selector: 'app-playlist-detail',
  imports: [FormsModule, RouterModule],
  templateUrl: './playlist-detail.component.html',
  styleUrls: ['../playlists.css', './playlist-detail.component.css'],
})
export class PlaylistDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(PlaylistService);
  private toastr = inject(CustomToastrService);
  readonly player = inject(PlayerService);
  readonly auth = inject(AuthService);
  readonly albumService = inject(AlbumService);
  readonly formatDuration = formatDuration;

  readonly playlist = signal<Playlist | null>(null);
  readonly error = signal('');
  readonly isOwner = computed(() => this.playlist()?.ownerId === this.auth.currentUser?.id);

  editing = false;
  editName = '';
  editDescription = '';
  busy = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => this.load(params.get('id')!));
  }

  private load(id: string): void {
    this.service.get(id).subscribe({
      next: (pl) => this.playlist.set(pl),
      error: (err: Error) => this.error.set(err.message),
    });
  }

  get isPlaying(): boolean {
    const pl = this.playlist();
    return !!pl && this.player.isCurrentPlaylist(pl.id) && this.player.playing();
  }

  isCurrentTrack(index: number): boolean {
    const pl = this.playlist();
    return !!pl && this.player.isCurrentPlaylist(pl.id) && this.player.index() === index;
  }

  play(startAt = 0): void {
    const pl = this.playlist();
    if (pl?.trackCount) this.player.playPlaylist(pl.id, startAt);
  }

  // ===== Owner =====

  startEdit(): void {
    const pl = this.playlist()!;
    this.editName = pl.name;
    this.editDescription = pl.description;
    this.editing = true;
  }

  saveEdit(event: Event): void {
    event.preventDefault();
    const name = this.editName.trim();
    if (!name) return;
    this.change({ name, description: this.editDescription.trim() }, () => (this.editing = false));
  }

  togglePublic(): void {
    const pl = this.playlist()!;
    this.change({ isPublic: !pl.isPublic }, (updated) =>
      this.toastr.showToast(
        updated.isPublic ? 'Everyone can now find and play it.' : 'Only you can see it now.',
        'success',
        updated.isPublic ? 'Playlist is public' : 'Playlist is private',
      ),
    );
  }

  private change(changes: Partial<Playlist>, done?: (pl: Playlist) => void): void {
    if (this.busy) return;
    this.busy = true;
    this.service.update(this.playlist()!.id, changes).subscribe({
      next: (pl) => {
        this.busy = false;
        this.playlist.set(pl);
        done?.(pl);
      },
      error: (err: Error) => this.fail(err),
    });
  }

  // Moves a track one step up (-1) or down (+1)
  move(index: number, step: -1 | 1): void {
    const pl = this.playlist()!;
    const tracks = [...(pl.tracks ?? [])];
    const to = index + step;
    if (to < 0 || to >= tracks.length || this.busy) return;
    [tracks[index], tracks[to]] = [tracks[to], tracks[index]];
    this.playlist.set({ ...pl, tracks }); // show it right away
    this.busy = true;
    this.service.reorder(pl.id, tracks.map((t) => t.trackId)).subscribe({
      next: (updated) => {
        this.busy = false;
        this.playlist.set(updated);
      },
      error: (err: Error) => {
        this.playlist.set(pl); // put it back
        this.fail(err);
      },
    });
  }

  remove(trackId: number, title: string): void {
    if (this.busy) return;
    this.busy = true;
    this.service.removeTrack(this.playlist()!.id, trackId).subscribe({
      next: (pl) => {
        this.busy = false;
        this.playlist.set(pl);
        this.toastr.showToast(`"${title}" was removed.`, 'info', 'Track removed');
      },
      error: (err: Error) => this.fail(err),
    });
  }

  deletePlaylist(): void {
    const pl = this.playlist()!;
    if (!confirm(`Delete the playlist "${pl.name}"? This cannot be undone.`)) return;
    this.service.delete(pl.id).subscribe({
      next: () => {
        if (this.player.isCurrentPlaylist(pl.id)) this.player.close();
        this.toastr.showToast(`"${pl.name}" was deleted.`, 'info', 'Playlist deleted');
        this.router.navigate(['/playlists/mine']);
      },
      error: (err: Error) => this.fail(err),
    });
  }

  private fail(err: Error): void {
    this.busy = false;
    this.toastr.showToast(err.message, 'error', 'Something went wrong');
  }
}
