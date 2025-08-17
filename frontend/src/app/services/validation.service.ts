import { Injectable } from '@angular/core';
import { FormGroup, AbstractControl } from '@angular/forms';

@Injectable({
  providedIn: 'root',
})
export class ValidationService {
  private currForm!: FormGroup;

  private errorMessages: Record<string, string> = {
    required: 'This field is required!',
    passwordMinLength: 'Password must be at least 8 characters long!',
    missingChars:
      'Password must contain at least one letter, one number and one special character!',
    email: 'Please enter a valid email address!',
    emailExists: 'Email already exists!',
    emailNotFound: 'No user found with this email!',
    usernameMinLength: 'Username must be at least 3 characters long!',
    usernameExists: 'Username already exists!',
    userNotFound: 'User not found!',
    wrongCredentials: 'Wrong email or password!',
    resetCodeNotFound: 'Invalid reset code!',
  };

  init(form: FormGroup) {
    this.currForm = form;
  }

  onBlur(field: string) {
    this.currForm.get(field)?.markAsTouched();
  }

  isFieldInvalid(field: string): boolean {
    const control = this.currForm.get(field);
    return !!control && control.touched && control.invalid;
  }

  //returns error message
  getErrorMessage(field: string): string {
    const control = this.currForm.get(field);
    if (!control || !control.errors) return '';

    for (const errorKey of Object.keys(control.errors)) {
      if (this.errorMessages[errorKey]) {
        return this.errorMessages[errorKey];
      }
    }

    return `Please enter a valid ${field}!`;
  }

  // returns the value only if the form is valid
  submit(): any | null {
    if (this.currForm.invalid) {
      Object.values(this.currForm.controls).forEach(
        (control: AbstractControl) => {
          control.markAsTouched();
        }
      );
      return null;
    }
    return this.currForm.value;
  }
}
