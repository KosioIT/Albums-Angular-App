import { Component, Inject, OnInit } from '@angular/core';
import { AlbumService } from '../../../services/album.service';
import { Router } from '@angular/router';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { albumExistsValidator } from '../../../validators/album/albumExists';
import { multiFieldMinLengthValidator } from '../../../validators/multiFieldLength';
import { ValidationMessageDirective } from '../../../directives/validation-message.directive';
import { FormHelperService } from '../../../services/form-helper.service';
import { notInFutureValidator } from '../../../validators/album/notInFuture';
import { ToastrService } from 'ngx-toastr'; 
import { FormValidationError } from '../../../errors/form-validation-error';

@Component({
  selector: 'app-album-create',
  standalone: true,
  imports: [ReactiveFormsModule, ValidationMessageDirective],
  templateUrl: './album-create.component.html',
  styleUrls: ['./album-create.component.css', '../../../styles/forms.css'],
})
export class AlbumCreateComponent implements OnInit {
  albumForm!: FormGroup;
  producersString: string = '';
  stringArray: string[] = [];
  isSubmitting: boolean = false;

  constructor(
    public albumService: AlbumService,
    public formHelperService: FormHelperService,
    @Inject(ToastrService) private toastr: ToastrService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.albumForm = this.fb.group(
      {
        title: [
          '',
          [Validators.required],
          [albumExistsValidator(this.albumService)],
        ],
        artist: ['', [Validators.required]],
        release_date: ['', [Validators.required, notInFutureValidator()]],
        genre: ['', [Validators.required]],
        cover_img_url: [
          '',
          [
            Validators.required,
            Validators.pattern(
              /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/
            ),
          ],
        ],
        producers: ['', [Validators.required]],
      },
      {
        validators: multiFieldMinLengthValidator({
          title: 3,
          artist: 3,
          cover_img_url: 3,
          genre: 3,
          producers: 3,
        }),
      }
    );
  }

  ngOnInit(): void {
    this.formHelperService.init(this.albumForm);
  }

  onCreateFormSubmit(): void {
    if (this.albumForm.valid) {
      const albumData = this.albumForm.value;
      this.stringArray = this.formHelperService.parseStringToArray(
        this.producersString
      );
      this.albumForm.patchValue({ producers: this.stringArray });
      this.isSubmitting = true;

      this.albumService.create(albumData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/admin/manage-albums']);
          this.toastr.success('Album created successfully!', 'Success');
          this.albumForm.reset();
        },
        error: (error) => {
          console.error('Error creating album:', error);
          throw error;
        },
      });
    } else {
      this.formHelperService.markAllAsTouched(this.albumForm);
      throw new FormValidationError();
    }
  }
}
