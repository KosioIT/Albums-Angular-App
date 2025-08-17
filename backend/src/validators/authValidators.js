import { body, validationResult } from 'express-validator';

const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

function emailValidator() {
  return body('email')
    .isEmail()
    .withMessage('Invalid email address');
}

function passwordValidator(fieldName = 'password') {
  return [
    body(fieldName)
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body(fieldName)
      .matches(passwordRegex)
      .withMessage(
        'Password must contain at least one letter, one number and one special character!'
      ),
  ];
}

function codeValidator(fieldName = 'code') {
  return body(fieldName)
    .isLength({ min: 6, max: 6 })
    .withMessage('Code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Code must contain only numbers');
}

function usernameValidator() {
  return body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters');
}

export const validateRegisterUser = [
  emailValidator(),
  ...passwordValidator('password'),
  usernameValidator(),
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

function validationResultHandler(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}
