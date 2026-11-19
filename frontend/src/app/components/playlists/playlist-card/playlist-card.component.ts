import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Playlist } from '../../../models/playlist';
import { PlayerService } from '../../../services/player.service';
import { formatDuration } from '../../../services/playlist.service';

// A playlist tile: cover collage, name, owner, size; Play starts it in the player
@Component({
  selector: 'app-playlist-card',
  imports: [RouterModule],
  templateUrl: './playlist-card.component.html',
  styleUrl: './playlist-card.component.css',
})
export class PlaylistCardComponent {
  @Input({ required: true }) playlist!: Playlist;
  @Input() showPrivacy = false; // on "My playlists"

  readonly player = inject(PlayerService);
  readonly formatDuration = formatDuration;

  get playing(): boolean {
    return this.player.isCurrentPlaylist(this.playlist.id) && this.player.playing();
  }

  play(event: Event): void {
    event.preventDefault(); // the card itself is a link to the playlist
    this.player.playPlaylist(this.playlist.id);
  }
}
