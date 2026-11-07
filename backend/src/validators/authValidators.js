import { body } from 'express-validator';
import { validationResultHandler } from './sharedValidators.js';
import { emailValidator, usernameValidator, passwordValidator } from './userValidators.js';

function codeValidator(fieldName = 'code') {
  return body(fieldName)
    .isLength({ min: 6, max: 6 })
    .withMessage('Code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Code must contain only numbers');
}

export const validateRegisterUser = [
  emailValidator(),
  ...passwordValidator('password'),
  usernameValidator(),
  validationResultHandler,
];

export const validateLogin = [
  emailValidator(),
  body('password').isString().notEmpty().withMessage('Password is required'),
  validationResultHandler,
];

export const validateResetRequest = [
  emailValidator(),
  validationResultHandler,
];

export const validateResetPassword = [
  emailValidator(),
  codeValidator('code'),
  ...passwordValidator('newPassword'),
  validationResultHandler,
];

export const validateCheckResetCode = [
  emailValidator(),
  codeValidator('code'),
  validationResultHandler,
];