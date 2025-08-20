import { Component, OnInit } from '@angular/core';

import { Album } from '../../models/album';
import { AlbumService } from '../../services/album.service';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
    selector: 'app-albums-list',
    imports: [RouterModule],
    templateUrl: './albums-list.component.html',
    styleUrls: ['./albums-list.component.css', '../../styles/albums-list.css']
})
export class AlbumsListComponent implements OnInit {
  albums: Album[] = [];
  isLoggedIn = false;
  hasMoreAlbums = false;
  band: string = '';

  constructor(
    public albumService: AlbumService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();

    this.route.queryParams.subscribe((params) => {
      this.band = params['band'] ? decodeURIComponent(params['band']) : '';

      if (!this.band || this.band === '') {
        throw new Error('No band name provided!');
      }
      this.albumService.getByBand(this.band).subscribe({
        next: (data) => {
          if (this.isLoggedIn) {
            console.log('Data: ', data);
            this.albums = data;
          } else {
            this.albums = data.slice(0, 6);
            this.hasMoreAlbums = data.length > 6;
          }
        },
        error: (err) => console.error(err),
      });
    });
  }

}
