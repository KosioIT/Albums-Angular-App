import { db } from '../config/firebase/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const USERS = db.collection('users');

function activityRef(userId, albumId) {
    return USERS.doc(userId).collection('activity').doc(albumId);
}

export async function recordListen(userId, albumId) {
    const batch = db.batch();
    batch.set(activityRef(userId, albumId), {
        listenCount: FieldValue.increment(1),
        lastListenedAt: new Date().toISOString(),
    }, { merge: true });
    batch.update(db.collection('albums').doc(albumId), { listens: FieldValue.increment(1) });
    await batch.commit();
}

export async function recordDownload(userId, albumId) {
    const batch = db.batch();
    batch.set(activityRef(userId, albumId), {
        downloadCount: FieldValue.increment(1),
        lastDownloadedAt: new Date().toISOString(),
    }, { merge: true });
    batch.update(db.collection('albums').doc(albumId), { downloads: FieldValue.increment(1) });
    await batch.commit();
}

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
            const { downloadUrl, ...album } = albumsById.get(a.albumId); // never expose the download link
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