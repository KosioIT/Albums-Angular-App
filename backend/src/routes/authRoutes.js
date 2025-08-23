import express from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { registerUser, loginUser, userExists } from '../controllers/authController.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';
import { validateResetPassword, validateRegisterUser, validateResetRequest } from '../validators/authValidators.js';
import { checkResetCode } from '../middleware/authMiddleware.js';
import generateToken from "../utils/generateToken.js";

const resetLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // max 5 reset requests per windowMs (5 minutes)
  message: 'Too many reset requests! Please try again after 5 minutes!',
});

const router = express.Router();

router.post('/register', validateRegisterUser, registerUser);

router.post('/login', loginUser);

router.post('/check-email', async (req, res) => {
  const { email } = req.body;
  res.json({ exists: await userExists(email) });
});

router.post('/check-username', async (req, res) => {
  const { username } = req.body;
  res.json({ exists: await User.findOne({ username }) });
});

router.post('/check-password', async (req, res) => {
  const { email, password } = req.body;
  const user = await userExists(email);
  if (!user) return res.json({ exists: false });
  const isValid = await user.matchEmail(email) && await user.matchPassword(password);
  res.json({ exists: isValid });
});

router.post('/request-reset', resetLimiter, validateResetRequest, async (req, res) => {
  let user;
  try {
    const { email } = req.body;
    user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedCode = await bcrypt.hash(resetCode, 10);
    user.resetToken = hashedCode;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    await sendEmail({
      to: email,
      subject: 'Password Reset Code',
      text: `Your password reset code is: ${resetCode}. It is valid for 15 minutes.`,
    });

    user.resetCodeStatus = 'sent';
    res.json({ message: 'Reset code sent to your email' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });

  } finally {
    if (user) await user.save();
  }

});

router.post('/check-reset-code', checkResetCode, (_req, res) => {
  res.json({ message: 'Reset code is valid' });
});

router.post('/reset-password', validateResetPassword, checkResetCode, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long!' });
    }

    user.password = newPassword;
    user.resetToken = null; // Clear reset token
    user.resetTokenExpiry = null; // Clear reset token expiry
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: 'Password has been reset successfully!',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
