import bcrypt from 'bcrypt';
import { generateToken } from '../utils/generateToken.js';
import { db } from '../config/firebase.js';
import {getUserByEmail, getUserFromSnapshot, checkExistingEmail} from './userController.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';

const USERS = db.collection('users');


/* ----- HELPER FUNCTIONS ----- */

//Get snapshot based on value type
export async function getUserFromSnapshot(valType, value) {
  try {
    let snapshot;
    switch (valType) {
      case "email":
        snapshot = await USERS.where('email', '==', value).get();
      default:
        snapshot = await USERS.where('username', '==', value).get();
    }
    const doc = snapshot.docs[0];
    return new User(doc.data(), doc.id);
  } catch (err) {
    //console.error('Get snapshot error:', err);
    throw new Error(err.message);
  }
}

//Check if email exists
export async function checkExistingEmail(email) {
  try {
    const snapshot = await USERS.where('email', '==', email).get();
    return { exists: !snapshot.empty, message: snapshot.empty ? 'Email is available' : 'Email already exists' };
  } catch (err) {
    console.error('Check email error:', err);
    throw new Error('Server error');
  }
}


/* ----- AUTH FUNCTIONS ----- */

//Register logic same as createUser in userController.js, but with password hashing

//Login user
export async function loginUser(req, res) {
  const { email, password } = req.body;

  try {
    const user = await getUserByEmail(email);

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Wrong password! Please try again.' });
    }

    // Generate 7-day token
    const token = generateToken({ id: user.id });

    // Save the token in Firestore
    user.setToken(token);
    await USERS.doc(user.id).update(user.toFirestore());

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Could not login!' });
  }
}

//Request reset code
export async function requestResetCode(req, res) {
  const { email } = req.body;
  try {
    const user = await getUserByEmail(email); // Ensure the user exists
    const userId = user.id;

    // Generate a 6-digit reset code and hash it
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(resetCode, 10);

    // Save the hash code to Firestore with an expiry time of 15 minutes
    await USERS.doc(userId).update({
      resetCode: hashedCode,
      resetCodeExpiry: Date.now() + 15 * 60 * 1000,
    });

    await sendEmail({
      to: email,
      subject: 'Password Reset Code',
      text: `Your password reset code is: ${resetCode}. It is valid for 15 minutes.`,
    });

    res.json({ success: true, message: 'Reset code sent to email!' });
  } catch (err) {
    console.error('Request reset code error:', err);
    res.status(500).json({ success: false, message: 'Could not request reset code!' });
  }
}

//Check reset code
export async function checkResetCode(req, res) {
  const { email, code } = req.body;
  try {
    const user = await getUserByEmail(email); // Ensure the user exists
    const isValid = await bcrypt.compare(code, user.resetCode);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid reset code!' });
    }
    res.status(200).json({ success: true, message: 'Reset code is valid' });
  } catch (err) {
    console.error('Check reset code error:', err);
    res.status(500).json({ success: false, message: 'Server error!' });
  }
}

//Reset password
export async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;
  try {
    const user = await getUserByEmail(email);

    const isValid = await bcrypt.compare(code, user.resetCode);
    if (!isValid || Date.now() > user.resetCodeExpiry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code!' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    //Reset the password and clear the reset code (and expiry) from Firestore
    await USERS.doc(user.id).update({
      password: hashedPassword,
      resetCode: null,
      resetCodeExpiry: null,
    });

    const token = generateToken({ id: user.id });

    res.status(200).json({
      message: 'Password has been reset successfully!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error!' });
  }
}