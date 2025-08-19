// src/app/core/errors/global-error-handler.ts
import { ErrorHandler, Injectable } from '@angular/core';
import { FormValidationError } from './form-validation-error';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private toastr: ToastrService) {}
  handleError(error: any): void {
    if (error instanceof FormValidationError) {
      console.warn('Form validation failed:', error.message);
      this.toastr.error('Form validation failed: ' + error.message, 'Validation Error');
    } else {
      console.error('Unexpected error:', error);
      this.toastr.error('An unexpected error occurred!', 'Error');
    }
  }
}
