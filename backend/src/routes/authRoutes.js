import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  validateRegisterUser,
  validateResetRequest,
  validateResetPassword
} from '../validators/authValidators.js';
import {loginUser,  requestResetCode, checkResetCode, resetPassword} from '../controllers/authController.js';
import { createUser } from '../controllers/userController.js';

const router = express.Router();

//Rate limiter for reset requests
const resetLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: 'Too many reset requests! Please try again after 5 minutes!',
});

//Register (Create) user
router.post('/register', validateRegisterUser, createUser);

//Login user
router.post('/login', loginUser);

//Request password reset code
router.post('/request-reset', resetLimiter, validateResetRequest, requestResetCode);

//Check reset code
router.post('/check-reset-code', checkResetCode);

//Reset password
router.post('/reset-password', validateResetPassword, resetPassword);

export default router;
