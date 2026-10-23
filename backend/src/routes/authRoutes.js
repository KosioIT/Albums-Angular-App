import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  validateRegisterUser,
  validateResetRequest,
  validateResetPassword
} from '../validators/authValidators.js';
import { loginUser, requestResetCode, checkResetCode, resetPassword, logoutUser } from '../controllers/authController.js';
import { registerUser } from '../controllers/userController.js';

const router = express.Router();

//Rate limiter for reset requests
const resetLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: 'Too many reset requests! Please try again after 5 minutes!',
});

//Register (Create) user
router.post('/register', validateRegisterUser, registerUser);

router.post('/login', loginUser);

router.post('/logout', logoutUser);

router.post('/request-reset', resetLimiter, validateResetRequest, requestResetCode);

router.post('/check-reset-code', checkResetCode);

router.post('/reset-password', validateResetPassword, resetPassword);

export default router;
