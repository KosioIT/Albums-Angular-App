import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PlaylistService } from '../../../services/playlist.service';
import { CustomToastrService } from '../../../services/custom-toastr.service';
import { Playlist } from '../../../models/playlist';
import { PlaylistCardComponent } from '../playlist-card/playlist-card.component';

// The signed-in user's playlists, and creating a new one
@Component({
  selector: 'app-my-playlists',
  imports: [FormsModule, PlaylistCardComponent],
  templateUrl: './my-playlists.component.html',
  styleUrls: ['../playlists.css', './my-playlists.component.css'],
})
export class MyPlaylistsComponent implements OnInit {
  readonly playlists = signal<Playlist[] | null>(null);
  readonly error = signal('');
  name = '';
  isPublic = false;
  creating = false;

  constructor(
    private service: PlaylistService,
    private toastr: CustomToastrService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.service.listMine().subscribe({
      next: (list) => this.playlists.set(list),
      error: (err: Error) => this.error.set(err.message),
    });
  }

  create(event: Event): void {
    event.preventDefault();
    const name = this.name.trim();
    if (!name || this.creating) return;
    this.creating = true;
    this.service.create(name, this.isPublic).subscribe({
      next: (pl) => this.router.navigate(['/playlists', pl.id]),
      error: (err: Error) => {
        this.creating = false;
        this.toastr.showToast(err.message, 'error', 'Could not create the playlist');
      },
    });
  }
}
