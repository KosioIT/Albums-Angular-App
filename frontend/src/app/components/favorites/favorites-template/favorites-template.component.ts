import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrModule } from 'ngx-toastr';
import { AuthService } from '../../../services/auth.service';
import { FavoriteService } from '../../../services/favorite.service';
import { Album } from '../../../models/album';
import { CustomToastrService } from '../../../services/custom-toastr.service';

@Component({
  selector: 'app-favorites-template',
  standalone: true,
  imports: [CommonModule, ToastrModule],
  templateUrl: './favorites-template.component.html',
  styleUrl: './favorites-template.component.css',
})
export class FavoritesTemplateComponent implements OnInit {
  @Input() albumId!: string;
  favoriteAlbums: Album[] = [];
  isFav: boolean = false;

  constructor(
    public authService: AuthService,
    private favoriteService: FavoriteService,
    private customToastr: CustomToastrService,
  ) {}

  ngOnInit(): void {
    this.authService.checkIfLoggedIn();
    if (!this.albumId) {
      throw new Error('Album ID is required!');
    }
    this.isFav = this.isFavorite();
    this.loadFavoriteAlbums();
  }

  loadFavoriteAlbums(): void {
    this.favoriteService.getAll().subscribe((albums) => {
      this.favoriteAlbums = albums;
    });
  }

  isFavorite(): boolean {
    return this.favoriteAlbums.some((album) => album._id === this.albumId);
  }

  toggleFavorite(): void {
    if (this.isFav) {
      this.favoriteService.remove(this.albumId).subscribe(() => {
        this.favoriteAlbums = this.favoriteAlbums.filter(
          (album) => album._id !== this.albumId
        );
        this.customToastr.showToast('Album removed from favorites!', 'success');
        this.isFav = false;
      });
    } else {
      this.favoriteService.add(this.albumId).subscribe({
        next: (album) => {
          this.favoriteAlbums.push(album);
          this.customToastr.showToast('Album added to favorites!', 'success');
          this.isFav = true;
        },
        error: (err) => {
          throw err;
        },
      });
    }
  }
}
