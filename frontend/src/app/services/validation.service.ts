import { Injectable } from '@angular/core';
import { AbstractControl } from '@angular/forms';

type ErrorMessageFn = (error: any) => string;

@Injectable({ providedIn: 'root' })

export class ValidationService {
  
  // ---------- Dynamic message generators ----------
  private minLengthMessageFor(field: string): ErrorMessageFn {
    return (error) =>
      `${field} must be at least ${error.requiredLength} characters long!`;
  }

  private requiredMessageFor(field: string): ErrorMessageFn {
    return () => `${field} is required!`;
  }

  // ---------- Field-specific messages ----------
  private fieldMessages: Record<
    string,
    Record<string, string | ErrorMessageFn>
  > = {
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

  // ---------- Global fallback messages ----------
  private globalMessages: Record<string, string | ErrorMessageFn> = {
    required: 'This field is required!',
    minlength: (error) =>
      `Field must be at least ${error.requiredLength} characters long!`,
    maxlength: (error) =>
      `Field must be at most ${error.requiredLength} characters long!`,
    email: 'Please enter a valid email address!',
    pattern: 'Invalid format!',
  };

  // ---------- Label formatter ----------
  private formatLabel(field: string): string {
    return field
      .replace(/[_-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // ---------- Main resolver ----------
  getErrorMessage(control: AbstractControl | null, field: string): string {
    if (!control) return '';

    const errors = control.errors || {};
    const parentErrors = control.parent?.errors || {};
    const combined = { ...parentErrors, ...errors };

    const fieldMsgs = this.fieldMessages[field] || {};

    for (const key of Object.keys(combined)) {
      const value = combined[key];

      // Field-specific message
      if (fieldMsgs[key]) {
        const msg = fieldMsgs[key];
        return typeof msg === 'function' ? msg(value) : msg;
      }

      // Custom minLength
      if (key === 'customMinLength' && fieldMsgs['customMinLength']) {
        const msg = fieldMsgs['customMinLength'];
        return typeof msg === 'function' ? msg(value) : msg;
      }

      // Global fallback
      if (this.globalMessages[key]) {
        const msg = this.globalMessages[key];
        return typeof msg === 'function' ? msg(value) : msg;
      }

      // Final fallback
      const label = this.formatLabel(field);
      return `${label} is invalid!`;
    }

    return '';
  }
}
