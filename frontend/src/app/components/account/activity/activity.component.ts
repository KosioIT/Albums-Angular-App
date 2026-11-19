import { Component, OnInit, computed, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivityService } from '../../../services/activity.service';
import { AlbumService } from '../../../services/album.service';
import { ActivityAlbum, MyActivity } from '../../../models/activity';

export type ActivityFilter = 'all' | 'liked' | 'listened' | 'downloaded';

export function filterActivity(albums: ActivityAlbum[], filter: ActivityFilter): ActivityAlbum[] {
  switch (filter) {
    case 'liked':
      return albums.filter((a) => a.liked);
    case 'listened':
      return albums.filter((a) => a.listenCount > 0);
    case 'downloaded':
      return albums.filter((a) => a.downloadCount > 0);
    default:
      return albums;
  }
}

// "My activity": what the signed-in user liked, listened to and downloaded
@Component({
  selector: 'app-activity',
  imports: [RouterModule, DatePipe, DecimalPipe],
  templateUrl: './activity.component.html',
  styleUrl: './activity.component.css',
})
export class ActivityComponent implements OnInit {
  readonly activity = signal<MyActivity | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly filter = signal<ActivityFilter>('all');

  readonly filters: { value: ActivityFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'liked', label: 'Liked' },
    { value: 'listened', label: 'Listened' },
    { value: 'downloaded', label: 'Downloaded' },
  ];

  readonly shown = computed(() => filterActivity(this.activity()?.albums ?? [], this.filter()));

  constructor(
    private activityService: ActivityService,
    public albumService: AlbumService,
  ) {}

  ngOnInit(): void {
    this.activityService.getMine().subscribe({
      next: (data) => {
        this.activity.set(data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  count(filter: ActivityFilter): number {
    return filterActivity(this.activity()?.albums ?? [], filter).length;
  }
}
