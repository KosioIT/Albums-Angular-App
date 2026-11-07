import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, requireCsrfHeader } from '../middleware/authMiddleware.js';
import {
  validateRegisterUser,
  validateLogin, validateResetRequest,
  validateCheckResetCode, validateResetPassword
} from '../validators/authValidators.js';
import {
  getMe,
  loginUser,
  logoutUser,
  requestResetCode,
  checkResetCode,
  resetPassword,
  refreshSession, logoutAll, getSessions, revokeSession
} from '../controllers/authController.js';
import { registerUser } from '../controllers/userController.js';

const router = express.Router();
const tooMany = (message) => ({ success: false, message });

const resetRequestLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  message: tooMany('Too many reset requests! Please try again after 5 minutes!'),
});

const resetVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: tooMany('Too many attempts! Please try again later.'),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: tooMany('Too many login attempts! Please try again later.'),
});

router.get('/me', protect, getMe);
router.post('/login', loginLimiter, validateLogin, loginUser);
router.post('/register', validateRegisterUser, registerUser);

router.post('/refresh', requireCsrfHeader, refreshSession);
router.post('/logout', protect, logoutUser);
router.post('/logout-all', protect, logoutAll);
router.get('/sessions', protect, getSessions);
router.delete('/sessions/:id', protect, revokeSession);

router.post('/request-reset', resetRequestLimiter, validateResetRequest, requestResetCode);
router.post('/check-reset-code', resetVerifyLimiter, validateCheckResetCode, checkResetCode);
router.post('/reset-password', resetVerifyLimiter, validateResetPassword, resetPassword);

export default router;
