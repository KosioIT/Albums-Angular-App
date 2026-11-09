import jwt from 'jsonwebtoken';
import { db } from '../config/firebase/firebase.js';
import { User } from '../models/User.js';
import { getSession } from '../services/sessionService.js';

const USERS = db.collection('users');

// Ensure user is authenticated 
export const protect = async (req, res, next) => {
  if (!req.headers.authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token!' });
  }

  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    const [doc, session] = await Promise.all([
      USERS.doc(decoded.id).get(),
      getSession(decoded.sid),
    ]);

    if (!doc.exists || !session || session.userId !== decoded.id) {
      return res.status(401).json({ success: false, message: 'Session expired!' });
    }

    req.user = new User(doc.data(), doc.id); // role comes from the database
    req.auth = decoded;
    return next();
  } catch (err) {
    // A bad or expired token is the client's problem (401, the frontend refreshes);
    // anything else (e.g. Firestore down) must not look like a logout
    if (err instanceof jwt.JsonWebTokenError) { // also covers TokenExpiredError
      return res.status(401).json({ success: false, message: 'Unauthorized!' });
    }
    console.error('protect error:', err);
    return res.status(500).json({ success: false, message: 'Server error!' });
  }
};

// The refresh cookie is sent automatically by the browser, so require a header that a cross-site form or image request cannot add
export const requireCsrfHeader = (req, res, next) => {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    return res.status(403).json({ success: false, message: 'Forbidden!' });
  }
  next();
};

// Ensure user is an admin
export const admin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access only!"
    });
  }

  next();
};