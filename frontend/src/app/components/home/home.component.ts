import { Component, OnInit } from '@angular/core';
import { Album } from '../../models/album';
import { AlbumService } from '../../services/album.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CustomToastrService } from '../../services/custom-toastr.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  gold_albums: Album[] = [];
  errorMessage: string = '';
  timestamp = Date.now();

  constructor(
    public albumService: AlbumService,
    private toastr: CustomToastrService,
  ) {}

  ngOnInit(): void {
    this.loadGoldAlbums();
  }

  loadGoldAlbums(): void {
    this.albumService.getByRank('gold').subscribe({
      next: (albums) => {
        this.gold_albums = albums;
        this.errorMessage = '';
        this.toastr.showToast(
          'Gold albums loaded successfully!',
          'success',
          'Success',
        );
      },
      error: (err: Error) => {
        this.gold_albums = [];
        this.errorMessage = err.message;
      },
    });
  }

  trackById(_index: number, album: Album): string {
    return album.id;
  }
}
