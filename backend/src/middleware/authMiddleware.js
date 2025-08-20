import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (err) {
      res.status(401).json({ message: 'Not authorized' });
    }
  }
  if (!token) res.status(401).json({ message: 'No token' });
};

export const checkResetCode = async (req, res, next) => {
  const { email, resetCode } = req.body;

  const user = await User.findOne({ email });

  if (!user || !user.resetToken || !user.resetTokenExpiry) {
    return res.status(400).json({ message: 'Invalid or expired reset code' });
  }

  const isExpired = user.resetTokenExpiry < Date.now();
  if (isExpired) {
    user.resetCodeStatus = 'expired';
    await user.save();
    return res.status(400).json({ message: 'Reset code has expired' });
  }

  const isValid = await bcrypt.compare(resetCode, user.resetToken);
  if (!isValid) {
    user.resetCodeStatus = 'invalid';
    await user.save();
    return res.status(400).json({ message: 'Invalid reset code' });
  }

  req.user = user;
  next();
};