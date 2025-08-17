import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
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

export default protect;

export const checkResetCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    if (user.resetToken !== code) {
      user.resetCodeStatus = 'invalid';
      await user.save();
      return res.status(400).json({ message: 'Invalid reset code!' });
    }

    if (Date.now() > user.resetTokenExpiry) {
      user.resetCodeStatus = 'expired';
      await user.save();
      return res.status(400).json({ message: 'Reset code has expired!' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
