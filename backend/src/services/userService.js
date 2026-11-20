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

/*
  The admin "Users" page: every user with their activity, in four reads however many users there are
  (users, all activity documents at once, sessions, playlists) instead of a few per user.
*/
export async function listUsersForAdmin() {
  const [usersSnap, activitySnap, sessionsSnap, playlistsSnap] = await Promise.all([
    USERS.get(),
    db.collectionGroup('activity').get(), // users/{email}/activity/{albumId}
    db.collection('sessions').get(),
    db.collection('playlists').get(),
  ]);

  const activity = new Map(); // email -> { listens, downloads }
  for (const doc of activitySnap.docs) {
    const email = doc.ref.parent.parent?.id;
    if (!email) continue;
    const a = activity.get(email) ?? { listens: 0, downloads: 0 };
    a.listens += doc.data().listenCount || 0;
    a.downloads += doc.data().downloadCount || 0;
    activity.set(email, a);
  }

  const now = Date.now();
  const sessions = new Map(); // email -> { active, lastSeen }
  for (const doc of sessionsSnap.docs) {
    const s = doc.data();
    if (!s.userId || !(s.expiresAt > now)) continue; // expired ones no longer count
    const entry = sessions.get(s.userId) ?? { active: 0, lastSeen: null };
    entry.active += 1;
    if (!entry.lastSeen || s.lastUsedAt > entry.lastSeen) entry.lastSeen = s.lastUsedAt;
    sessions.set(s.userId, entry);
  }

  const playlists = new Map(); // email -> count
  for (const doc of playlistsSnap.docs) {
    const owner = doc.data().ownerId;
    if (owner) playlists.set(owner, (playlists.get(owner) ?? 0) + 1);
  }

  return usersSnap.docs.map((doc) => {
    const user = new User(doc.data(), doc.id).toPublic();
    const a = activity.get(doc.id) ?? { listens: 0, downloads: 0 };
    const s = sessions.get(doc.id) ?? { active: 0, lastSeen: null };
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      stats: {
        ...user.stats,
        listens: a.listens,
        downloads: a.downloads,
        playlists: playlists.get(doc.id) ?? 0,
        activeSessions: s.active,
        lastSeen: s.lastSeen,
      },
    };
  });
}

export const ROLES = ['user', 'admin'];

// Changes a user's role; the caller (an admin) cannot change their own, so there is always an admin left
export async function setUserRole(adminId, email, role) {
  if (!ROLES.includes(role)) return { status: 400, message: 'Role must be "user" or "admin".' };
  if (email === adminId) return { status: 400, message: 'You cannot change your own role.' };

  const ref = USERS.doc(email);
  const snap = await ref.get();
  if (!snap.exists) return { status: 404, message: 'User not found!' };
  if (snap.data().role === role) return { status: 200, role };

  await ref.update({ role, updated_at: new Date().toISOString() });
  return { status: 200, role }; // takes effect on the user's next request: the role is read from the database
}
