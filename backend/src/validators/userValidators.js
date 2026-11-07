import { body } from 'express-validator';
import { validationResultHandler } from './sharedValidators.js';

const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export function usernameValidator() {
  return body('username')
    .isString().withMessage('Username must be a string')
    .bail()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters');
}

// Email is the Firestore document id, so it is always stored lowercase
export function emailValidator() {
  return body('email')
    .isString().withMessage('Invalid email address')
    .bail()
    .trim()
    .toLowerCase()
    .isEmail().withMessage('Invalid email address');
}

export function passwordValidator(fieldName = 'password') {
  return [
    body(fieldName)
      .isString().withMessage('Password must be a string')
      .bail()
      .isLength({ min: 8, max: 72 })
      .withMessage('Password must be between 8 and 72 characters')
      .bail()
      .matches(passwordRegex)
      .withMessage('Password must contain at least one letter, one number and one special character!'),
  ];
}

export const validateUpdateUser = [
  usernameValidator().optional(),
  emailValidator().optional(),
  ...passwordValidator('password').map(v => v.optional()),
  validationResultHandler,
];