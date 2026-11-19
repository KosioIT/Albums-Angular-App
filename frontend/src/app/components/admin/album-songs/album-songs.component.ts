import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AlbumService } from '../../../services/album.service';
import { CustomToastrService } from '../../../services/custom-toastr.service';
import { AlbumSongs, COVER, SongTarget, SongTrack } from '../../../models/album-songs';
import { uploadFile } from '../../../core/upload-file';
import { formatTime } from '../../player/player.component';

const AUDIO_RE = /\.(mp3|m4a|aac|ogg|opus|flac|wav)$/i;
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;
const PARALLEL_UPLOADS = 3;

// A chosen file waiting to be uploaded; target is the select's value: '' (skip), 'cover' or a track id
interface PickedFile {
  file: File;
  target: string;
  problem: string | null; // why it cannot be uploaded (type / size)
  progress: number; // 0..1
  state: 'ready' | 'uploading' | 'done' | 'failed';
  error?: string;
}

/*
  Admin page for an album's song files (/admin/albums/:id/songs).
  Files are matched to the album's Deezer tracks by name, the admin can change that, and the
  browser uploads them straight to R2. Signed-in users then hear (and download) the whole songs.
*/
@Component({
  selector: 'app-album-songs',
  imports: [RouterLink],
  templateUrl: './album-songs.component.html',
  styleUrl: './album-songs.component.css',
})
export class AlbumSongsComponent {
  private albums = inject(AlbumService);
  private toastr = inject(CustomToastrService);
  private id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;

  readonly COVER = COVER;
  readonly formatTime = formatTime;
  readonly data = signal<AlbumSongs | null>(null);
  readonly error = signal<string | null>(null);
  readonly picked = signal<PickedFile[]>([]);
  readonly matching = signal(false);
  readonly uploading = signal(false);
  readonly removing = signal<string | null>(null);
  dragOver = false;

  readonly stored = computed(() => this.data()?.tracks.filter((t) => t.file).length ?? 0);

  // Targets chosen for more than one file
  readonly clashes = computed(() => {
    const seen = new Map<string, number>();
    this.picked().forEach((p) => p.target && seen.set(p.target, (seen.get(p.target) ?? 0) + 1));
    return new Set([...seen].filter(([, n]) => n > 1).map(([t]) => t));
  });

  readonly toUpload = computed(() => this.picked().filter((p) => p.target && !p.problem && p.state !== 'done'));
  readonly canUpload = computed(() => !this.uploading() && this.toUpload().length > 0 && this.clashes().size === 0);

  constructor() {
    this.load();
  }

  load(): void {
    this.error.set(null);
    this.albums.songs(this.id).subscribe({
      next: (data) => this.data.set(data),
      error: (err: Error) => this.error.set(err.message),
    });
  }

  // ===== Choosing files =====

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.add(Array.from(input.files ?? []));
    input.value = ''; // the same files can be chosen again
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    this.add(Array.from(event.dataTransfer?.files ?? []));
  }

  private add(files: File[]): void {
    const data = this.data();
    if (!data || !files.length || this.uploading()) return;

    const known = new Set(this.picked().map((p) => p.file.name));
    const fresh = files.filter((f) => !known.has(f.name));
    const room = data.limits.files - this.picked().length;
    if (fresh.length > room) this.toastr.showToast(`Up to ${data.limits.files} files at a time.`, 'info', 'Too many files');

    const rows: PickedFile[] = fresh.slice(0, Math.max(0, room)).map((file) => ({
      file,
      target: '',
      problem: this.problemWith(file),
      progress: 0,
      state: 'ready',
    }));
    if (!rows.length) return;
    this.picked.update((list) => [...list, ...rows]);

    // Suggest which song each file is (the admin can change it)
    const names = rows.filter((r) => !r.problem).map((r) => r.file.name);
    if (!names.length) return;
    this.matching.set(true);
    this.albums.matchSongFiles(this.id, names).subscribe({
      next: (matches) => {
        this.matching.set(false);
        const byName = new Map(matches.map((m) => [m.name, m.target]));
        const taken = new Set(this.picked().map((p) => p.target).filter(Boolean));
        this.picked.update((list) =>
          list.map((p) => {
            const suggestion = byName.get(p.file.name);
            if (!rows.includes(p) || suggestion == null || taken.has(String(suggestion))) return p;
            taken.add(String(suggestion));
            return { ...p, target: String(suggestion) };
          }),
        );
      },
      error: (err: Error) => {
        this.matching.set(false);
        this.toastr.showToast(err.message, 'error', 'Could not match the files');
      },
    });
  }

  private problemWith(file: File): string | null {
    const limits = this.data()!.limits;
    const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;
    if (AUDIO_RE.test(file.name)) return file.size > limits.audioBytes ? `Bigger than ${mb(limits.audioBytes)}` : null;
    if (IMAGE_RE.test(file.name)) return file.size > limits.imageBytes ? `Bigger than ${mb(limits.imageBytes)}` : null;
    return 'Not a song or an image';
  }

  isImage(p: PickedFile): boolean {
    return IMAGE_RE.test(p.file.name);
  }

  setTarget(p: PickedFile, target: string): void {
    this.picked.update((list) => list.map((x) => (x === p ? { ...x, target } : x)));
  }

  removePicked(p: PickedFile): void {
    this.picked.update((list) => list.filter((x) => x !== p));
  }

  clearPicked(): void {
    if (!this.uploading()) this.picked.set([]);
  }

  trackLabel(t: SongTrack): string {
    return `${t.position + 1}. ${t.title}${t.file ? ' (replace)' : ''}`;
  }

  // ===== Uploading =====

  async upload(): Promise<void> {
    if (!this.canUpload()) return;
    const rows = this.toUpload();
    this.uploading.set(true);
    const patch = (row: PickedFile, change: Partial<PickedFile>) =>
      this.picked.update((list) => list.map((x) => (x.file === row.file ? { ...x, ...change } : x)));

    try {
      const links = await firstValueFrom(
        this.albums.createSongUploads(
          this.id,
          rows.map((r) => ({ name: r.file.name, size: r.file.size, target: this.toTarget(r.target) })),
        ),
      );

      // A few at a time: the browser sends each file straight to R2
      const queue = rows.map((row, i) => ({ row, link: links[i] }));
      const uploaded: { key: string; target: SongTarget }[] = [];
      const worker = async () => {
        for (let job = queue.shift(); job; job = queue.shift()) {
          const { row, link } = job;
          patch(row, { state: 'uploading', progress: 0, error: undefined });
          try {
            await uploadFile(link.url, row.file, link.contentType, (progress) => patch(row, { progress })).done;
            uploaded.push({ key: link.key, target: link.target });
            patch(row, { state: 'done', progress: 1 });
          } catch (err) {
            patch(row, { state: 'failed', error: (err as Error).message });
          }
        }
      };
      await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, worker));

      if (uploaded.length) {
        this.data.set(await firstValueFrom(this.albums.completeSongUploads(this.id, uploaded)));
        this.picked.update((list) => list.filter((p) => p.state !== 'done'));
      }
      const failed = rows.length - uploaded.length;
      if (failed) this.toastr.showToast(`${failed} file(s) could not be uploaded.`, 'error', 'Upload incomplete');
      else this.toastr.showToast(`${uploaded.length} file(s) saved.`, 'success', 'Upload complete');
    } catch (err) {
      this.toastr.showToast((err as Error).message, 'error', 'Upload failed');
      this.picked.update((list) => list.map((p) => (p.state === 'uploading' ? { ...p, state: 'failed' } : p)));
    } finally {
      this.uploading.set(false);
    }
  }

  private toTarget(value: string): SongTarget {
    return value === COVER ? COVER : Number(value);
  }

  // ===== Stored files =====

  remove(target: SongTarget, label: string): void {
    if (!confirm(`Delete the file of "${label}"? Signed-in users will hear the 30-second preview instead.`)) return;
    this.removing.set(String(target));
    this.albums.removeSong(this.id, target).subscribe({
      next: (data) => {
        this.removing.set(null);
        this.data.set(data);
      },
      error: (err: Error) => {
        this.removing.set(null);
        this.toastr.showToast(err.message, 'error', 'Could not delete the file');
      },
    });
  }

  size(bytes: number | null | undefined): string {
    if (!bytes) return '';
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
  }
}
