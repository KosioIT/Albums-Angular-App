import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function multiFieldMinLengthValidator(
  fields: Record<string, number>
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    if (!group || typeof group !== 'object') return null;

    const errors: Record<string, any> = {};

    for (const [fieldName, minLength] of Object.entries(fields)) {
      const control = group.get(fieldName);
      const value = control?.value;

      if (value && value.length < minLength) {
        errors[`${fieldName}_customMinLength`] = {
          actualLength: value.length,
          requiredLength: minLength,
        };
      }
    }

    return Object.keys(errors).length ? errors : null;
  };
}
