import { Component } from '@angular/core';
import { AlbumService } from '../../../services/album.service';
import { Album } from '../../../models/album';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-manage-albums',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './manage-albums.component.html',
  styleUrls: [
    './manage-albums.component.css',
    '../../../styles/albums-list.css',
  ],
})
export class ManageAlbumsComponent {
  albums: Album[] = [];
  timestamp = Date.now();
  editStates: { [key: string]: boolean } = {};
  inputText: string = '';
  stringArray: string[] = [];

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

  isEditing(albumId: string): boolean {
    return !!this.editStates[albumId];
  }

  toggleEdit(albumId: string) {
    if (this.isEditing(albumId)) {
      this.saveEdit(this.albums.find((a) => a._id === albumId)!);
    } else {
      this.startEdit(albumId);
    }
  }

  startEdit(albumId: string) {
    this.editStates[albumId] = true;
  }

  saveEdit(album: any) {
    this.editStates[album._id] = false;
    this.updateAlbum(album);
  }

  onInputChange(): void {
    this.stringArray = this.parseStringToArray(this.inputText);
  }

  parseStringToArray(input: string, delimiter: string = ','): string[] {
    return input
      .split(delimiter)
      .map((str) => str.trim())
      .filter((str) => str.length > 0);
  }

  updateAlbum(album: Album): void {
    this.albumService.update(album._id, album).subscribe((album) => {
      const index = this.albums.findIndex((a) => a._id === album._id);
      if (index !== -1) {
        this.albums[index] = album;
      } else {
        this.albums.push(album);
      }
    });
  }

  deleteAlbum(id: string): void {
    this.albumService.delete(id).subscribe(() => {
      this.albums = this.albums.filter((album) => album._id !== id);
    });
  }
}
