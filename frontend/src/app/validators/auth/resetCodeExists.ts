import { AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { map, catchError, debounceTime, first, switchMap, of } from 'rxjs';

export function resetCodeExistsValidator(authService: AuthService, email: string): AsyncValidatorFn {
  return (control: AbstractControl) => {
    return control.valueChanges.pipe(
      debounceTime(500),
      switchMap(code => {
        if (!email || !code) {
          return of(null); // No email or code -> no possible validation
        }
        return authService.checkResetCode(email, code).pipe(
          map(() => null), // valid code
          catchError(() => of({ resetCodeNotFound: true })) // invalid code
        );
      }),
      first()
    );
  };
}
