import { AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { map, catchError, switchMap, of, timer } from 'rxjs';

export function resetCodeExistsValidator(
  authService: AuthService,
  email: string,
): AsyncValidatorFn {
  return (control: AbstractControl) => {
    return timer(400).pipe(
      switchMap(() => {
        const code = control.value;

        if (!email || !code) {
          return of(null);
        }

        return authService.checkResetCode(email, code).pipe(
          map((result) => {
            return result.isValid ? null : { resetCodeNotFound: true };
          }),
          catchError(() => of({ resetCodeNotFound: true })),
        );
      }),
    );
  };
}
