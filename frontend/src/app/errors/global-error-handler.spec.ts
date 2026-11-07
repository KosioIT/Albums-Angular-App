import { TestBed } from '@angular/core/testing';
import { GlobalErrorHandler } from './global-error-handler';
import { CustomToastrService } from '../services/custom-toastr.service';
import { ApiError } from './api-errors/normalizeApiError';

describe('GlobalErrorHandler', () => {
  it('shows the error message in a toast', () => {
    const toastr = jasmine.createSpyObj<CustomToastrService>('CustomToastrService', ['showToast']);
    TestBed.configureTestingModule({
      providers: [GlobalErrorHandler, { provide: CustomToastrService, useValue: toastr }],
    });
    spyOn(console, 'error');

    TestBed.inject(GlobalErrorHandler).handleError(new ApiError('Session expired!', 401));

    expect(toastr.showToast).toHaveBeenCalledWith('Session expired!', 'error', 'Error');
  });
});
