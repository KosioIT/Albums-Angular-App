import { db } from '../config/firebase/firebase.js';
import { User } from '../models/User.js';

const USERS = db.collection('users');

export async function getUserBy(field, value) {
  try {
    let doc;

    // Direct lookup when field is email (document ID)
    if (field === "email") {
      const snapshot = await USERS.doc(value).get();
      if (!snapshot.exists) return null;
      doc = snapshot;
    } else {
      // Query lookup by any other field
      const snapshot = await USERS.where(field, '==', value).get();
      if (snapshot.empty) return null;
      doc = snapshot.docs[0];
    }

    return new User(doc.data(), doc.id);

  } catch (err) {
    throw new Error(err.message);
  }
}

export async function checkExistingCredential(field, value) {
  if (!field || !value) {
    throw new Error("Missing field or value!");
  }

  return !!(await getUserBy(field, value));
}