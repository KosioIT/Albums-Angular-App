import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormValidationError } from '../errors/form-validation-error';
@Injectable({
  providedIn: 'root',
})
export class FormHelperService {
  private currForm!: FormGroup;

  constructor() {}

  init(form: FormGroup) {
    this.currForm = form;
  }

  onBlur(field: string) {
    const control = this.currForm.get(field);
    control?.markAsTouched();
    control?.markAsDirty();
    control?.updateValueAndValidity();
  }

  submit<T extends Record<string, any>>(): T {
    if (this.currForm.invalid) {
      Object.values(this.currForm.controls).forEach((control) =>
        control.markAsTouched()
      );

      const errors: Record<string, string[]> = {};

      Object.entries(this.currForm.controls).forEach(([key, control]) => {
        if (control.errors) {
          errors[key] = Object.keys(control.errors);
        }
      });

      throw new FormValidationError(errors);
    }

    return this.currForm.value as T;
  }

  parseStringToArray(input: string, delimiter: string = ','): string[] {
    return input
      .split(delimiter)
      .map((str) => str.trim())
      .filter((str) => str.length > 0);
  }

  markAllAsTouched(albumForm: FormGroup<any>) {
    Object.values(albumForm.controls).forEach((control) => {
      control.markAsTouched();
      control.markAsDirty();
    });
  }
}
