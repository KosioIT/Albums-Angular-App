import { Component, OnInit } from '@angular/core';
import { Album } from '../../models/album';
import { AlbumService } from '../../services/album.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
    selector: 'app-home',
    imports: [CommonModule, RouterModule],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  gold_albums: Album[] = [];
  errorMessage: string = '';
  timestamp = Date.now();

  constructor(public albumService: AlbumService, private router: Router) {}

  ngOnInit(): void {
    this.loadGoldAlbums();
  }

  loadGoldAlbums(): void {
    this.albumService.getByRank('gold').subscribe({
      next: (albums) => {
        this.gold_albums = albums;
        this.errorMessage = albums.length === 0 ? 'No gold albums found.' : '';
      },
      error: (err) => {
        this.errorMessage = 'Error loading albums: ' + err.message;
      },
    });
  }

  trackById(_index: number, album: Album): string {
    return album._id;
  }
}
