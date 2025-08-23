import { Component, OnInit } from '@angular/core';
import { FavoriteService } from '../../../services/favorite.service';
import { Album } from '../../../models/album';
import { AuthService } from '../../../services/auth.service';
import { AlbumService } from '../../../services/album.service';
import { RouterModule } from '@angular/router';
import { ToastrModule } from 'ngx-toastr';

@Component({
  selector: 'app-favorite-albums',
  standalone: true,
  imports: [RouterModule, ToastrModule],
  templateUrl: './favorite-albums.component.html',
  styleUrls: ['./favorite-albums.component.css', '../../../styles/albums-list.css'],
})
export class FavoriteAlbumsComponent implements OnInit {
  favoriteAlbums: Album[] = [];

  constructor(public albumService: AlbumService, private authService: AuthService, private favoriteService: FavoriteService) { }

  ngOnInit(): void {
    this.authService.checkIfLoggedIn();
    this.loadFavoriteAlbums();
  }

  loadFavoriteAlbums(): void {
    this.favoriteService.getAll().subscribe((albums) => {
      this.favoriteAlbums = albums;
    });
  }

  addToFavorites(albumId: string): void {
    this.favoriteService.add(albumId).subscribe(() => {
      this.loadFavoriteAlbums();
    });
  }

  removeFromFavorites(albumId: string): void {
    this.favoriteService.remove(albumId).subscribe(() => {
      this.favoriteAlbums = this.favoriteAlbums.filter(album => album._id !== albumId);
    });
  }

}
