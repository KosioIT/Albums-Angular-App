import { db } from '../config/firebase.js';

const USERS = db.collection('users');

export async function checkExistingEmail(email) {
  try {
    const snapshot = await USERS.where('email', '==', email).get();
    return { exists: !snapshot.empty, message: snapshot.empty ? 'Email is available' : 'Email already exists!' };
  } catch (err) {
    console.error('Check email error:', err);
    throw new Error('Server error');
  }
}
