import { db } from '../config/firebase/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const USERS = db.collection('users');

function activityRef(userId, albumId) {
    return USERS.doc(userId).collection('activity').doc(albumId);
}

// One user can add at most one listen / download per album per minute (stops double clicks and spamming)
const REPEAT_COOLDOWN_MS = 60 * 1000;

/*
  Adds one to the album counter and the user's activity, unless the same user did it less than a minute ago.
  kind: "listen" | "download". Returns true when it was counted.
*/
async function recordOnce(userId, albumId, kind) {
    const countField = `${kind}Count`;
    const lastField = kind === 'listen' ? 'lastListenedAt' : 'lastDownloadedAt';
    const albumField = kind === 'listen' ? 'listens' : 'downloads';
    const ref = activityRef(userId, albumId);

    return db.runTransaction(async (t) => {
        const last = (await t.get(ref)).data()?.[lastField];
        if (last && Date.now() - new Date(last).getTime() < REPEAT_COOLDOWN_MS) return false;

        t.set(ref, { [countField]: FieldValue.increment(1), [lastField]: new Date().toISOString() }, { merge: true });
        t.update(db.collection('albums').doc(albumId), { [albumField]: FieldValue.increment(1) });
        return true;
    });
}

export const recordListen = (userId, albumId) => recordOnce(userId, albumId, 'listen');

/*
  A visitor without an account: counted in album.guestListens only (no personal history).
  At most once a minute per album for the same browser id AND for the same IP address,
  so clearing the browser data alone does not add more listens.
  Kept in memory: enough for one server, and a restart only forgets the last minute.
*/
const guestSeen = new Map(); // "albumId|kind|value" -> time of the last counted listen

function recentlyCounted(key, now) {
    const last = guestSeen.get(key);
    return last !== undefined && now - last < REPEAT_COOLDOWN_MS;
}

export async function recordGuestListen(albumId, guestId, ip) {
    const now = Date.now();
    const keys = [`${albumId}|ip|${ip}`, ...(guestId ? [`${albumId}|guest|${guestId}`] : [])];
    if (keys.some((k) => recentlyCounted(k, now))) return false;

    keys.forEach((k) => guestSeen.set(k, now));
    if (guestSeen.size > 50000) {
        for (const [k, t] of guestSeen) if (now - t >= REPEAT_COOLDOWN_MS) guestSeen.delete(k);
    }

    await db.collection('albums').doc(albumId).update({ guestListens: FieldValue.increment(1) });
    return true;
}
export const recordDownload = (userId, albumId) => recordOnce(userId, albumId, 'download');

export async function setLiked(userId, albumId, liked) {
    await activityRef(userId, albumId).set({
        liked,
        likedAt: liked ? new Date().toISOString() : null,
    }, { merge: true });
}

export async function getActivity(userId) {
    const snap = await USERS.doc(userId).collection('activity').get();
    return snap.docs.map(d => ({ albumId: d.id, ...d.data() }));
}

export async function getActivitySummary(userId) {
    const activity = await getActivity(userId);
    const relevant = activity.filter(a => a.liked || a.listenCount > 0 || a.downloadCount > 0);

    const refs = relevant.map(a => db.collection('albums').doc(a.albumId));
    const docs = refs.length ? await db.getAll(...refs) : [];
    const albumsById = new Map(docs.filter(d => d.exists).map(d => [d.id, d.data()]));

    const albums = relevant
        .filter(a => albumsById.has(a.albumId))
        .map(a => {
            const { downloadKey, downloadUrl, ...album } = albumsById.get(a.albumId); // never expose where the archive is
            return {
                albumId: a.albumId,
                ...album,
                liked: !!a.liked,
                listenCount: a.listenCount || 0,
                downloadCount: a.downloadCount || 0,
                lastActivityAt: [a.likedAt, a.lastListenedAt, a.lastDownloadedAt].filter(Boolean).sort().pop(),
            };
        })
        .sort((x, y) => y.lastActivityAt.localeCompare(x.lastActivityAt));

    return {
        stats: {
            likedAlbums: albums.filter(a => a.liked).length,
            listenedAlbums: albums.filter(a => a.listenCount > 0).length,
            downloadedAlbums: albums.filter(a => a.downloadCount > 0).length,
            totalListens: albums.reduce((s, a) => s + a.listenCount, 0),
            totalDownloads: albums.reduce((s, a) => s + a.downloadCount, 0),
        },
        albums,
    };
}