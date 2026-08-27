import jwt from 'jsonwebtoken';
import { db } from '../config/firebase.js';
import User from '../models/User.js';

const USERS = db.collection('users');

/** 
 * JWT Protect Middleware 
 */
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const doc = await USERS.doc(decoded.id).get();

      if (!doc.exists) {
        return res.status(401).json({ message: 'Unauthorized!' });
      }

     const userInstance = new User(doc.data(), doc.id);

      req.user = userInstance;

      return next();
    } catch (err) {
      return res.status(401).json({ message: 'Unauthorized!' });
    }
  }

  return res.status(401).json({ message: 'No token!' });
};

/**
 * Check Reset Code Middleware
 */
export const checkResetCode = async (req, res, next) => {
  const { email, code } = req.body;

  const snapshot = await USERS.where('email', '==', email).get();
  if (snapshot.empty) {
    return res.status(400).json({ message: 'Invalid or expired reset code!' });
  }

  const doc = snapshot.docs[0];
  const userData = doc.data();
  const userInstance = new User(userData, doc.id);

  if (!userInstance.resetCode || !userInstance.resetCodeExpiry) {
    return res.status(400).json({ message: 'Invalid or expired reset code!' });
  }

  const isExpired = userInstance.resetCodeExpiry < Date.now();
  if (isExpired) {
    await USERS.doc(doc.id).update({ resetCodeStatus: 'expired' });
    return res.status(400).json({ message: 'Reset code has expired!' });
  }

  const isValid = await bcrypt.compare(code, userInstance.resetCode);
  if (!isValid) {
    await USERS.doc(doc.id).update({ resetCodeStatus: 'invalid' });
    return res.status(400).json({ message: 'Invalid reset code!' });
  }

  req.user = userInstance;
  next();
};
