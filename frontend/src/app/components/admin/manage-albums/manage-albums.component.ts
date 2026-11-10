import { Component } from '@angular/core';
import { AlbumService } from '../../../services/album.service';
import { Album } from '../../../models/album';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FormHelperService } from '../../../services/form-helper.service';
import { CustomToastrService } from '../../../services/custom-toastr.service';

@Component({
    selector: 'app-manage-albums',
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './manage-albums.component.html',
    styleUrls: [
        './manage-albums.component.css',
        '../../../styles/albums-list.css',
    ]
})
export class ManageAlbumsComponent {
  albums: Album[] = [];
  timestamp = Date.now();
  editStates: { [key: string]: boolean } = {};
  producersString: string = '';
  stringArray: string[] = [];

  constructor(public albumService: AlbumService, private formHelperService: FormHelperService, private toastr: CustomToastrService) {
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

  toggleEdit(albumId: string): void {
    if (this.isEditing(albumId)) {
      // Save the edited copy from the table (it is bound with ngModel)
      const album = this.albums.find((a) => a.id === albumId);
      if (!album) throw new Error(`Album with ID ${albumId} not found!`);
      this.saveEdit(album);
    } else {
      this.startEdit(albumId);
    }
  }

  startEdit(albumId: string): void {
    this.editStates[albumId] = true;
  }

  saveEdit(album: Album): void {
    this.editStates[album.id] = false;
    this.updateAlbum(album.id, album);

  }

  onProducersChange(album: Album): void {
    this.stringArray = this.formHelperService.parseStringToArray(this.producersString);
    album.producers = this.stringArray;
    this.updateAlbum(album.id, { producers: this.stringArray });
  }

  updateAlbum(albumId: string, updatedData: Object): void {
    Object.values(updatedData).forEach((value) => {
      if (typeof value === 'string' && value.length === 0) {
        value = "Unknwown";
      }
    });
    
    this.albumService.update(albumId, updatedData).subscribe((album) => {
      const index = this.albums.findIndex((a) => a.id === album.id);
      if (index !== -1) {
        this.albums[index] = album;
      } else {
        this.albums.push(album);
      }
      this.toastr.showToast(`Album '${album.title}' updated successfully!`, 'success', 'Success');
    });
    
  }

  deleteAlbum(id: string): void {
    this.albumService.delete(id).subscribe(() => {
      this.albums = this.albums.filter((album) => album.id !== id);
      this.toastr.showToast(`Album '${this.albums.find((a) => a.id === id)?.title}' deleted successfully!`, 'success', 'Success');
    });
  }
}
