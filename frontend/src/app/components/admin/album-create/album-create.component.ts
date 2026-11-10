import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlbumService } from '../../../services/album.service';
import { albumExistsValidator } from '../../../validators/album/albumExists';
import { ValidationMessageDirective } from '../../../directives/validation-message.directive';
import { FormHelperService } from '../../../services/form-helper.service';
import { notInFutureValidator } from '../../../validators/album/notInFuture';
import { CustomToastrService } from '../../../services/custom-toastr.service';
import { Album } from '../../../models/album';

// <input type="date"> gives "1987-07-21"; the API stores "21.07.1987"
export function toApiDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

@Component({
  selector: 'app-album-create',
  imports: [ReactiveFormsModule, ValidationMessageDirective],
  templateUrl: './album-create.component.html',
  styleUrls: ['./album-create.component.css', '../../../styles/forms.css'],
})
export class AlbumCreateComponent implements OnInit {
  albumForm: FormGroup;
  isSubmitting = false;

  constructor(
    public albumService: AlbumService,
    public formHelperService: FormHelperService,
    private toastr: CustomToastrService,
    private fb: FormBuilder,
    private router: Router,
  ) {
    this.albumForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)], [albumExistsValidator(this.albumService)]],
      artist: ['', [Validators.required, Validators.minLength(3)]],
      release_date: ['', [Validators.required, notInFutureValidator()]],
      genre: ['', [Validators.required, Validators.minLength(3)]],
      cover_img_url: ['', [Validators.required, Validators.pattern(/^https?:\/\/\S+$/)]],
      producers: ['', [Validators.required, Validators.minLength(3)]], // comma separated
    });
  }

  ngOnInit(): void {
    this.formHelperService.init(this.albumForm);
  }

  onCreateFormSubmit(): void {
    if (this.isSubmitting) return;
    const form = this.formHelperService.submit<Record<string, string>>(); // shows the errors if invalid

    const album = {
      title: form['title'].trim(),
      artist: form['artist'].trim(),
      genre: form['genre'].trim(),
      cover_img_url: form['cover_img_url'].trim(),
      release_date: toApiDate(form['release_date']),
      producers: this.formHelperService.parseStringToArray(form['producers']),
    } as Partial<Album>;

    this.isSubmitting = true;
    this.albumService.create(album as Album).subscribe({
      next: () => {
        this.toastr.showToast(`"${album.title}" was added.`, 'success', 'Album created');
        this.router.navigate(['/admin/albums']);
      },
      error: (err: Error) => {
        this.isSubmitting = false;
        this.toastr.showToast(err.message, 'error', 'Could not create the album');
      },
    });
  }
}
