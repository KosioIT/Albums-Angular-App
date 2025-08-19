import { Injectable } from '@angular/core';
import { AbstractControl } from '@angular/forms';

type ErrorMessageFn = (error: any) => string;
@Injectable({
  providedIn: 'root',
})
export class ValidationService {
  private minLengthMessageFor(fieldName: string): ErrorMessageFn {
    return (error) =>
      `${fieldName} must be at least ${error.requiredLength} characters long!`;
  }

  private requiredMessageFor(fieldName: string): ErrorMessageFn {
    return (_error) => `${fieldName} is required!`;
  }

  private fieldErrorMessages: Record<
    string,
    Record<string, string | ErrorMessageFn>
  > = {
    //Auth errors:
    password: {
      required: this.requiredMessageFor('Password'),
      customMinLength: this.minLengthMessageFor('Password'),
      missingChars:
        'Password must contain at least one letter, one number and one special character!',
    },
    email: {
      required: this.requiredMessageFor('Email'),
      email: 'Please enter a valid email address!',
      emailExists: 'Email already exists!',
      emailNotFound: 'No user found with this email!',
    },
    username: {
      required: this.requiredMessageFor('Username'),
      customMinLength: this.minLengthMessageFor('Username'),
      usernameExists: 'Username already exists!',
      userNotFound: 'User not found!',
    },
    wrongCredentials: {
      wrongCredentials: 'Wrong email or password!',
    },
    resetCode: {
      resetCodeNotFound: 'Invalid reset code!',
    },
    //Album errors:
    title: {
      required: this.requiredMessageFor('Title'),
      customMinLength: this.minLengthMessageFor('Title'),
      albumExists: 'Album with this title already exists!',
    },
    artist: {
      required: this.requiredMessageFor('Artist'),
      customMinLength: this.minLengthMessageFor('Artist'),
    },
    release_date: {
      required: this.requiredMessageFor('Release date'),
      notInPast: 'Release date cannot be in the future!',
    },
    genre: {
      required: this.requiredMessageFor('Genre'),
      customMinLength: this.minLengthMessageFor('Genre'),
    },
    cover_img_url: {
      required: this.requiredMessageFor('Cover image URL'),
      customMinLength: this.minLengthMessageFor('Cover image URL'),
      pattern: 'Please enter a valid URL!',
    },
    producers: {
      required: this.requiredMessageFor('Producers'),
      customMinLength: this.minLengthMessageFor('Producers'),
    },
  };

  private globalErrorMessages: Record<string, string | ErrorMessageFn> = {
    required: 'This field is required!',
    minlength: (error) =>
      `Field must be at least ${error.requiredLength} characters long!`,
    email: 'Please enter a valid email address!',
  };

  private formatFieldLabel(fieldName: string): string {
    // Split camelCase into words and capitalize the first letter
    const spaced = fieldName.replace(/([a-z])([A-Z])/g, '$1 $2');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  getErrorMessage(control: AbstractControl | null, fieldName: string): string {
    if (
      !control ||
      (!control.touched && control.value === '') ||
      (!control.errors && !control.parent?.errors)
    ) {
      return '';
    }

    console.log('Field name:', fieldName);
    console.log('Errors:', control?.errors);
    console.log(
      'Message found:',
      this.fieldErrorMessages[fieldName]?.['required']
    );

    const errors = control.errors || {};
    const parentErrors = control.parent?.errors || {};
    const fieldMessages = this.fieldErrorMessages[fieldName] || {};

    const combinedErrors = { ...parentErrors, ...errors };
    // console.log('Errors for', fieldName, combinedErrors);
    // console.log('Available messages:', this.fieldErrorMessages[fieldName]);

    for (const errorKey of Object.keys(combinedErrors)) {
      const errorValue = combinedErrors[errorKey];

      // Skip if the error is not relevant to the field
      if (
        errorKey !== fieldName &&
        !errorKey.startsWith(`${fieldName}_`) &&
        !(errorKey in fieldMessages)
      ) {
        continue;
      }

      // Check for direct match in fieldMessages
      const directMessage = fieldMessages[errorKey];
      if (directMessage) {
        return typeof directMessage === 'function'
          ? directMessage(errorValue)
          : directMessage;
      }

      // Custom field-level message
      const customMessage = fieldMessages['customMinLength'];
      if (customMessage && errorKey.endsWith('_customMinLength')) {
        return typeof customMessage === 'function'
          ? customMessage(errorValue)
          : customMessage;
      }

      // Global fallback
      const globalMessage = this.globalErrorMessages[errorKey];
      if (globalMessage) {
        return typeof globalMessage === 'function'
          ? globalMessage(errorValue)
          : globalMessage;
      }

      // Final fallback
      const label = this.formatFieldLabel(fieldName);
      return `${label} must be at least ${
        errorValue?.requiredLength ?? 'X'
      } characters long!`;
    }

    return `Please enter a valid ${this.formatFieldLabel(
      fieldName
    ).toLowerCase()}!`;
  }
}
