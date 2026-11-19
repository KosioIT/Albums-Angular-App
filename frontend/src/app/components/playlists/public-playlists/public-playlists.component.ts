import { Component, OnInit, signal } from '@angular/core';
import { PlaylistService } from '../../../services/playlist.service';
import { Playlist } from '../../../models/playlist';
import { PlaylistCardComponent } from '../playlist-card/playlist-card.component';

// Playlists that their owners made public; open to everyone, guests included
@Component({
  selector: 'app-public-playlists',
  imports: [PlaylistCardComponent],
  templateUrl: './public-playlists.component.html',
  styleUrl: '../playlists.css',
})
export class PublicPlaylistsComponent implements OnInit {
  readonly playlists = signal<Playlist[] | null>(null);
  readonly error = signal('');

  constructor(private service: PlaylistService) {}

  ngOnInit(): void {
    this.service.listPublic().subscribe({
      next: (list) => this.playlists.set(list),
      error: (err: Error) => this.error.set(err.message),
    });
  }
}
