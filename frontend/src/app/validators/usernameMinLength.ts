import { AbstractControl, ValidatorFn } from "@angular/forms";

export function usernameMinLengthValidator(min: number): ValidatorFn {
  return (control: AbstractControl) => {
    if (control.value && control.value.length < min) {
      return { usernameMinLength: true };
    }
    return null;
  };
}