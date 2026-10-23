import { FormValidationError } from './form-validation-error';

describe('FormValidationError', () => {
  it('should create an instance', () => {
    expect(new FormValidationError()).toBeTruthy();
  });
});
