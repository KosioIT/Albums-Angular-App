import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function notInFutureValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    const inputDate = new Date(value);
    const today = new Date();

    // Set both dates to the start of the day to avoid time discrepancies
    inputDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return inputDate > today ? { notInPast: true } : null;
  };
}
