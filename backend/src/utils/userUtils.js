import { db } from '../config/firebase.js';
import User from '../models/User.js';

const USERS = db.collection('users');

//Get snapshot based on value type
export async function getUserFromSnapshot(valType, value) {
  try {
    let snapshot;

    switch (valType) {
      case "email":
        snapshot = await USERS.where('email', '==', value).get();
        break;
      default:
        snapshot = await USERS.where('username', '==', value).get();
        break;
    }
    if (snapshot.empty) throw new Error('User not found!');

    const doc = snapshot.docs[0];
    return new User(doc.data(), doc.id);

  } catch (err) {
    //console.error('Get snapshot error:', err);
    throw new Error(err.message);
  }
}

export async function getUserBy(field, value) {
  try {
    let doc;

    if (field === "id") {
      // Direct lookup by document ID
      const snapshot = await USERS.doc(value).get();
      if (!snapshot.exists) return null;
      doc = snapshot;
    } else {
      // Query lookup by field
      const snapshot = await USERS.where(field, '==', value).get();
      if (snapshot.empty) return null;
      doc = snapshot.docs[0];
    }

    return new User(doc.data(), doc.id);

  } catch (err) {
    throw new Error(err.message);
  }
}

