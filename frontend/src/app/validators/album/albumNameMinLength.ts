import { AbstractControl, ValidatorFn } from '@angular/forms';

export function albumNameMinLengthValidator(min: number): ValidatorFn {
  return (control: AbstractControl) => {
    if (control.value && control.value.length < min) {
      return {
        albumNameMinLength: {
          actualLength: control.value.length,
          requiredLength: min
        }
      };
    }
    return null;
  };
}
