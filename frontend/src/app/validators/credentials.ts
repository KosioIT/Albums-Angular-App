import { AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { map, first, of } from 'rxjs';

export function passwordMatchesValidator(authService: AuthService): AsyncValidatorFn {
  return (control: AbstractControl) => {
    if (!control.parent) {
      return of(null); // FormGroup not yet initialized
    }

    const email = control.parent.get('email')?.value;
    const password = control.value;

    // No email or password -> no possible validation
    if (!email || !password) {
      return of(null);
    }

    return authService.checkCredentials({ email, password }).pipe(
      map(res => res.exists ? null : {wrongCredentials: true }),
      first()
    );
  };
}
