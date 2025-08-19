import { AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { AlbumService } from '../../services/album.service';
import { debounceTime, first, map, switchMap } from 'rxjs';

export function albumExistsValidator(
  albumService: AlbumService
): AsyncValidatorFn {
  return (control: AbstractControl) => {
    return albumService.getByName(control.value).pipe(
      debounceTime(500),
      map((albums) => {
        const exists = albums.length > 0;
        return exists ? { albumExists: true } : null;
      }),
      first()
    );
  };
}
