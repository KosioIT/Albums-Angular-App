import { ErrorHandler, Injectable } from '@angular/core';
import { FormValidationError } from './form-errors/form-validation-error';
import { CustomToastrService } from '../services/custom-toastr.service';
import { normalizeApiError } from './api-errors/normalizeApiError';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private customToastr: CustomToastrService) {}
  handleError(error: unknown): void {
    if (error instanceof FormValidationError) {
      console.warn('Form validation failed:', error.message);
      this.customToastr.showToast(
        'Form validation failed: ' + error.message,
        'error',
        'Validation Error'
      );
    } else {
      try {
        normalizeApiError(error);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unexpected error occurred!';

        console.error('Error:', error);
        this.customToastr.showToast(message, 'error', 'Error');
      }
    }
  }
}
