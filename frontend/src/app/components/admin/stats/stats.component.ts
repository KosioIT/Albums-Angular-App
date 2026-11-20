import { Component, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivityService } from '../../../services/activity.service';
import { AlbumService } from '../../../services/album.service';
import { SiteStats, StatsAlbum } from '../../../models/activity';

type TopKey = keyof SiteStats['top'];

// Site-wide statistics for admins
@Component({
  selector: 'app-stats',
  imports: [RouterModule, DecimalPipe],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css',
})
export class StatsComponent implements OnInit {
  readonly stats = signal<SiteStats | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly topLists: { key: TopKey; title: string; icon: string; value: (a: StatsAlbum) => number }[] = [
    { key: 'listens', title: 'Most listened', icon: 'assets/images/music_btn-green.png', value: (a) => a.totalListens },
    { key: 'likes', title: 'Most liked', icon: 'assets/images/like_btn-blue.png', value: (a) => a.likes },
    { key: 'downloads', title: 'Most downloaded', icon: 'assets/images/download_icon2-orange.png', value: (a) => a.downloads },
  ];

  constructor(
    private activityService: ActivityService,
    public albumService: AlbumService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.activityService.getSiteStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  // Share of guest listens, for the "by signed-in users / by guests" line
  guestShare(stats: SiteStats): number {
    const { totalListens, guestListens } = stats.totals;
    return totalListens ? Math.round((guestListens / totalListens) * 100) : 0;
  }
}
