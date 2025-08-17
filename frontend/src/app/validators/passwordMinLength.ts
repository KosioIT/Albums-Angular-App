import { AbstractControl, ValidatorFn } from "@angular/forms";

export function passwordMinLengthValidator(min: number): ValidatorFn {
    return (control: AbstractControl) => {
        if (control.value && control.value.length < min) {
            return { passwordMinLength: true };
        }
        return null;
    };
}