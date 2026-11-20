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

/*
  What happens to a user once the admins voted for it (see voteService, which checks who may
  propose what). Each one takes effect on the user's next request: the server reads the role and
  the ban from the database every time.
*/

export const BAN_DAYS = [1, 7, 30]; // or null: permanent
const DAY_MS = 24 * 60 * 60 * 1000;
export const SUSPENSION_MS = DAY_MS;

export async function setRole(email, role) {
  await USERS.doc(email).update({ role, updated_at: new Date().toISOString() });
}

// days: 1, 7, 30 or null (permanent); by: the admin who proposed it
export async function banUser(email, { reason, days, by, voteId = null }) {
  const now = new Date();
  const ban = {
    reason,
    until: days == null ? null : new Date(now.getTime() + days * DAY_MS).toISOString(),
    by,
    at: now.toISOString(),
    voteId,
  };
  await USERS.doc(email).update({ ban, updated_at: now.toISOString() });
  await revokeAllSessions(email); // out right away, on every device
  return ban;
}

export async function unbanUser(email) {
  await USERS.doc(email).update({ ban: FieldValue.delete(), updated_at: new Date().toISOString() });
}

/*
  Suspension while the admins vote on banning or deleting someone: a 24-hour ban marked with the
  vote, lifted as soon as the vote fails (see liftSuspension); a ban that passes replaces it.
*/
export async function suspendUser(email, { reason, by, voteId }) {
  const now = new Date();
  const ban = {
    reason,
    until: new Date(now.getTime() + SUSPENSION_MS).toISOString(),
    by,
    at: now.toISOString(),
    voteId,
    suspension: true,
  };
  await USERS.doc(email).update({ ban, updated_at: now.toISOString() });
  await revokeAllSessions(email);
  return ban;
}

// Lifts the suspension of this vote only (not a ban set since)
export async function liftSuspension(email, voteId) {
  const snap = await USERS.doc(email).get();
  const ban = snap.exists ? snap.data().ban : null;
  if (ban?.suspension && ban.voteId === voteId) await unbanUser(email);
}

/*
  Deletes a user and what is theirs: sessions, their likes in the album counters, playlists,
  the user document and its "activity" subcollection.
*/
export async function deleteUserAccount(email) {
  const ref = USERS.doc(email);
  const snap = await ref.get();
  if (!snap.exists) return;

  await revokeAllSessions(email); // first, so the user cannot act while the data is removed

  const liked = snap.data().likedAlbums || [];
  if (liked.length) {
    const albums = await db.getAll(...liked.map((id) => db.collection('albums').doc(id)));
    const batch = db.batch();
    albums.filter((a) => a.exists).forEach((a) => batch.update(a.ref, { likes: FieldValue.increment(-1) }));
    await batch.commit(); // one batch holds up to 500 writes, plenty for now
  }

  const owned = await db.collection('playlists').where('ownerId', '==', email).get();
  await Promise.all(owned.docs.map((d) => d.ref.delete()));

  await db.recursiveDelete(ref);
}
