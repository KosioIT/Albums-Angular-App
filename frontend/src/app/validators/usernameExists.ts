import { AbstractControl, AsyncValidatorFn } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { debounceTime, switchMap, map, first, of } from 'rxjs';

export function usernameExistsValidator(authService: AuthService): AsyncValidatorFn {
    return (control: AbstractControl) => {
        return control.valueChanges.pipe(
            debounceTime(500),
            switchMap(username => authService.checkIfUsernameExists(username)),
            map(exists => exists ? { usernameExists: true } : null),
            first()
        );
    }
}