import { AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { debounceTime, switchMap, map, first } from 'rxjs/operators';

export function emailExistsValidator(authService: AuthService, mode: 'register' | 'reset'): AsyncValidatorFn {
  return (control: AbstractControl) => {
    return control.valueChanges.pipe(
      debounceTime(500),  // wait 500ms after the last event before considering the term
      switchMap(value => authService.checkIfEmailExists(value)),
      map(exists => {
        if (mode === 'register' && exists) {
          return { emailExists: true };
        } else if (mode === 'reset' && !exists) {
          return { emailNotFound: true };
        }
        return null;
      }),
      first()
    );
  };
}
