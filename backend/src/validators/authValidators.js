import { body, validationResult } from 'express-validator';

const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

/**
 * Email validator
 */
function emailValidator() {
  return body('email')
    .isEmail()
    .withMessage('Invalid email address');
}

/**
 * Password validator
 */
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

/**
 * Reset code validator
 */
function codeValidator(fieldName = 'code') {
  return body(fieldName)
    .isLength({ min: 6, max: 6 })
    .withMessage('Code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Code must contain only numbers');
}

/**
 * Username validator
 */
function usernameValidator() {
  return body('username')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters');
}

/**
 * Array of album IDs validator
 */
function albumIdArrayValidator(fieldName) {
  return body(fieldName)
    .optional()
    .isArray()
    .withMessage(`${fieldName} must be an array`)
    .custom(arr => arr.every(id => typeof id === 'string'))
    .withMessage(`${fieldName} must contain only string IDs`);
}

/**
 * totalLikes validator
 */
function totalLikesValidator() {
  return body('totalLikes')
    .optional()
    .isNumeric()
    .withMessage('totalLikes must be a number');
}

/**
 * Registration validator
 */
export const validateRegisterUser = [
  emailValidator(),
  ...passwordValidator('password'),
  usernameValidator(),
  validationResultHandler,
];

/**
 * Reset request validator
 */
export const validateResetRequest = [
  emailValidator(),
  validationResultHandler,
];

/**
 * Reset password validator
 */
export const validateResetPassword = [
  emailValidator(),
  codeValidator('code'),
  ...passwordValidator('newPassword'),
  validationResultHandler,
];

/**
 * Update user validator (Firebase-friendly)
 */
export const validateUpdateUser = [
  usernameValidator().optional(),
  emailValidator().optional(),
  ...passwordValidator('password').map(v => v.optional()),
  albumIdArrayValidator('favorites'),
  albumIdArrayValidator('likedAlbums'),
  totalLikesValidator(),
  validationResultHandler,
];

/**
 * Error handler
 */
function validationResultHandler(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}