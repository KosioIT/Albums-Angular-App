import { Component, HostListener, inject } from '@angular/core';
import { PlayerService } from '../../services/player.service';

// "m:ss" from seconds
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// The player bar at the bottom of every page (shown while an album is loaded)
@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrl: './player.component.css',
})
export class PlayerComponent {
  readonly player = inject(PlayerService);
  readonly formatTime = formatTime;
  showTracks = false;

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

  // Space plays / pauses, unless the user is typing somewhere
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.code !== 'Space' || !this.player.album()) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
    event.preventDefault();
    this.player.toggle();
  }
}
