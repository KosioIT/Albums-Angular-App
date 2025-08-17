import { Component } from '@angular/core';
import { AlbumService } from '../../../services/album.service';
import { Album } from '../../../models/album';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-manage-albums',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './manage-albums.component.html',
  styleUrls: ['./manage-albums.component.css', '../../../styles/albums-list.css'],
})
export class ManageAlbumsComponent {
  albums: Album[] = [];
  timestamp = Date.now();

  constructor(public albumService: AlbumService) {
    this.albumService.getAll().subscribe((albums) => {
      this.albums = albums;
    });
  }

  addAlbum(album: Album): void {
    this.albumService.create(album).subscribe((album) => {
      this.albums.push(album);
    });
  }

  updateAlbum(album: Album): void {
    this.albumService.update(album._id, album).subscribe((album) => {
      const index = this.albums.findIndex((a) => a._id === album._id);
      if (index !== -1) {
        this.albums[index] = album;
      }
    });
  }

  deleteAlbum(id: string): void {
    this.albumService.delete(id).subscribe(() => {
      this.albums = this.albums.filter((album) => album._id !== id);
    });
  }
}
