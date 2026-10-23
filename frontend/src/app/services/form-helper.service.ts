import { Injectable } from '@angular/core';
import { FormGroup, AbstractControl } from '@angular/forms';
import { FormValidationError } from '../errors/form-errors/form-validation-error';

@Injectable({ providedIn: 'root' })
export class FormHelperService {
  private form!: FormGroup;

  init(form: FormGroup): void {
    this.form = form;
  }

  onBlur(field: string): void {
    const control = this.form.get(field);
    if (!control) return;

    control.markAsTouched();
    control.updateValueAndValidity();
  }

  submit<T extends Record<string, any>>(): T {
    if (!this.form) {
      throw new Error('FormHelperService: form not initialized.');
    }

    if (this.form.invalid) {
      this.markAllAsTouched(this.form);
      throw new FormValidationError();
    }

    return this.form.value as T;
  }

  private markAllAsTouched(control: AbstractControl): void {
    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach((child) => {
        child.markAsTouched();
        this.markAllAsTouched(child);
      });
    }
  }

  parseStringToArray(input: string, delimiter: string = ','): string[] {
    return input
      .split(delimiter)
      .map((str) => str.trim())
      .filter((str) => str.length > 0);
  }
}
