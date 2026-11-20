import { db } from '../config/firebase/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { User } from '../models/User.js';
import { revokeAllSessions } from './sessionService.js';

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
      ban: user.ban, // only one in force (see User.toPublic)
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
  if (role === 'admin' && new User(snap.data(), snap.id).activeBan()) {
    return { status: 400, message: 'Unban the user before making them an admin.' };
  }

  await ref.update({ role, updated_at: new Date().toISOString() });
  return { status: 200, role }; // takes effect on the user's next request: the role is read from the database
}

export const BAN_DAYS = [1, 7, 30]; // or null: permanent
const DAY_MS = 24 * 60 * 60 * 1000;

/*
  Bans a user: they are signed out everywhere and cannot sign in (they are told the reason) until
  the ban runs out or an admin lifts it. Admins cannot ban themselves or another admin (remove the
  rights first). days: 1, 7, 30 or null for a permanent ban.
*/
export async function banUser(admin, email, { reason, days } = {}) {
  const text = typeof reason === 'string' ? reason.trim().replace(/\s+/g, ' ') : '';
  if (text.length < 3 || text.length > 300) return { status: 400, message: 'Give a reason (3 to 300 characters).' };
  if (days !== null && !BAN_DAYS.includes(days)) return { status: 400, message: 'Ban for 1, 7 or 30 days, or permanently.' };
  if (email === admin.id) return { status: 400, message: 'You cannot ban yourself.' };

  const ref = USERS.doc(email);
  const snap = await ref.get();
  if (!snap.exists) return { status: 404, message: 'User not found!' };
  if (snap.data().role === 'admin') return { status: 400, message: 'Remove their admin rights before banning them.' };

  const now = new Date();
  const ban = {
    reason: text,
    until: days === null ? null : new Date(now.getTime() + days * DAY_MS).toISOString(),
    by: admin.id,
    at: now.toISOString(),
  };
  await ref.update({ ban, updated_at: now.toISOString() });
  await revokeAllSessions(email); // out right away, on every device
  return { status: 200, ban };
}

export async function unbanUser(email) {
  const ref = USERS.doc(email);
  const snap = await ref.get();
  if (!snap.exists) return { status: 404, message: 'User not found!' };
  await ref.update({ ban: FieldValue.delete(), updated_at: new Date().toISOString() });
  return { status: 200 };
}
