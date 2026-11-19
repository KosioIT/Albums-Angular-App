import { db } from '../config/firebase/firebase.js';
import { getAlbumPreviews } from './previewService.js';
import { createStreamLink, createUploadLink, deleteObject, listObjects, objectSize } from './storageService.js';
import { AUDIO_RE, audioType, fullTrackFor, matchTrackFiles } from '../utils/trackMatch.js';

/*
  An album's songs, managed by admins (the "Songs" page):
    1. getSongs          the album's tracks on Deezer and which of them have a file
    2. matchFiles        which chosen file belongs to which track (by title; the admin can change it)
    3. createUploads     a link per file: the browser uploads it straight to R2
    4. completeUploads   checks the files arrived and saves them in album.fullTracks / album.coverKey
  Files live in R2 under tracks/<album id>/, the list of them in Firestore. A change makes the next
  album download pack a new zip (see albumZipService).
*/

const ALBUMS = db.collection('albums');
const MB = 1024 * 1024;
export const LIMITS = { audioBytes: 60 * MB, imageBytes: 10 * MB, files: 60 };
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;
const IMAGE_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export const COVER = 'cover';

export class SongError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const prefixOf = (albumId) => `tracks/${albumId}/`;
const extOf = (name) => name.split('.').pop().toLowerCase();
const baseName = (key) => key.split('/').pop();

// A file name that is safe as part of an object key: no folders, no control characters
export function safeName(name) {
    const base = String(name).split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f]/g, '').trim();
    return base.length > 180 ? base.slice(base.length - 180) : base;
}

async function loadAlbum(albumId) {
    const doc = await ALBUMS.doc(albumId).get();
    if (!doc.exists) throw new SongError(404, 'Album not found!');
    return { id: doc.id, ...doc.data() };
}

// The album's tracks on Deezer: the songs a file can belong to
async function tracksOf(album) {
    let previews;
    try {
        previews = await getAlbumPreviews(album);
    } catch {
        throw new SongError(502, 'Deezer is not answering right now. Please try again later.');
    }
    if (!previews) {
        throw new SongError(404, 'This album was not found on Deezer, so its track list is unknown.');
    }
    return previews.tracks;
}

export async function getSongs(albumId) {
    const album = await loadAlbum(albumId);
    const tracks = await tracksOf(album);
    const fullTracks = album.fullTracks || [];
    return {
        album: { id: album.id, title: album.title, artist: album.artist, cover_img_url: album.cover_img_url || null },
        tracks: tracks.map((t, position) => {
            const file = fullTrackFor(fullTracks, t, album.artist);
            return {
                id: t.id,
                title: t.title,
                duration: t.duration,
                position,
                file: file ? { name: baseName(file.key), size: file.size ?? null } : null,
            };
        }),
        cover: album.coverKey ? { name: baseName(album.coverKey), url: await createStreamLink(album.coverKey) } : null,
        limits: LIMITS,
    };
}

// names -> [{ name, target }]: a track id, "cover" for the (first) image, or null when nothing fits
export async function matchFiles(albumId, names) {
    if (!Array.isArray(names) || names.length === 0 || names.length > LIMITS.files) {
        throw new SongError(400, `Choose between 1 and ${LIMITS.files} files.`);
    }
    const album = await loadAlbum(albumId);
    const tracks = await tracksOf(album);
    const files = names.map((name) => ({ name: String(name) }));

    const { matched } = matchTrackFiles(files.filter((f) => AUDIO_RE.test(f.name)), tracks, album.artist);
    const byName = new Map(matched.map(({ file, track }) => [file, track.id]));
    const firstImage = files.find((f) => IMAGE_RE.test(f.name));

    return files.map((f) => ({ name: f.name, target: byName.get(f) ?? (f === firstImage ? COVER : null) }));
}

// Checks one { name, size, target } and returns where it goes and its type
function plan(file, album, trackIds, usedKeys) {
    const name = safeName(file?.name ?? '');
    const size = Number(file?.size);
    if (!name) throw new SongError(400, 'Every file needs a name.');
    if (!Number.isFinite(size) || size <= 0) throw new SongError(400, `"${name}" is empty.`);

    if (file.target === COVER) {
        if (!IMAGE_RE.test(name)) throw new SongError(400, `"${name}": the cover must be a JPG, PNG or WebP image.`);
        if (size > LIMITS.imageBytes) throw new SongError(400, `"${name}" is bigger than ${LIMITS.imageBytes / MB} MB.`);
        const ext = extOf(name).replace('jpeg', 'jpg');
        return { name, target: COVER, key: `${prefixOf(album.id)}cover.${ext}`, contentType: IMAGE_TYPES[ext] };
    }

    const trackId = Number(file.target);
    if (!trackIds.has(trackId)) throw new SongError(400, `"${name}": choose which song it is.`);
    if (!AUDIO_RE.test(name)) throw new SongError(400, `"${name}" is not an audio file (MP3, M4A, OGG, FLAC, WAV).`);
    if (size > LIMITS.audioBytes) throw new SongError(400, `"${name}" is bigger than ${LIMITS.audioBytes / MB} MB.`);

    // Two songs never share a file: a name already used by another song gets the track id in front
    let key = prefixOf(album.id) + name;
    const owner = (album.fullTracks || []).find((t) => t.key === key);
    if ((owner && owner.trackId !== trackId) || usedKeys.has(key)) key = `${prefixOf(album.id)}${trackId} - ${name}`;
    usedKeys.add(key);
    return { name, target: trackId, key, contentType: audioType(name) };
}

// files: [{ name, size, target }] -> [{ name, target, key, url, contentType }]
export async function createUploads(albumId, files) {
    if (!Array.isArray(files) || files.length === 0 || files.length > LIMITS.files) {
        throw new SongError(400, `Upload between 1 and ${LIMITS.files} files at a time.`);
    }
    const album = await loadAlbum(albumId);
    const trackIds = new Set((await tracksOf(album)).map((t) => t.id));

    const targets = files.map((f) => String(f?.target));
    if (new Set(targets).size !== targets.length) {
        throw new SongError(400, 'Two files are set for the same song (or two covers).');
    }

    const usedKeys = new Set();
    const planned = files.map((f) => plan(f, album, trackIds, usedKeys));
    return Promise.all(planned.map(async (p) => ({ ...p, url: await createUploadLink(p.key, p.contentType) })));
}

// files: [{ key, target }] uploaded with createUploads' links -> saved; returns getSongs()
export async function completeUploads(albumId, files) {
    if (!Array.isArray(files) || files.length === 0 || files.length > LIMITS.files) {
        throw new SongError(400, 'Nothing to save.');
    }
    const album = await loadAlbum(albumId);
    const tracks = await tracksOf(album);
    const prefix = prefixOf(album.id);

    const uploaded = [];
    for (const f of files) {
        const key = String(f?.key ?? '');
        const cover = f?.target === COVER;
        const track = cover ? null : tracks.find((t) => t.id === Number(f?.target));
        if (!key.startsWith(prefix) || key.includes('..') || (!cover && !track)) throw new SongError(400, 'Invalid file.');

        const size = await objectSize(key);
        if (size === null) throw new SongError(400, `"${baseName(key)}" did not arrive. Please upload it again.`);
        if (size > (cover ? LIMITS.imageBytes : LIMITS.audioBytes)) {
            await deleteObject(key);
            throw new SongError(400, `"${baseName(key)}" is too big.`);
        }
        uploaded.push({ key, size, cover, track, position: track ? tracks.indexOf(track) : null });
    }

    // Saved in a transaction, so two admins saving at once do not lose each other's songs
    const replaced = await db.runTransaction(async (tx) => {
        const ref = ALBUMS.doc(album.id);
        const current = (await tx.get(ref)).data() || {};
        let fullTracks = [...(current.fullTracks || [])];
        let coverKey = current.coverKey || null;
        const old = [];

        for (const u of uploaded) {
            if (u.cover) {
                if (coverKey && coverKey !== u.key) old.push(coverKey);
                coverKey = u.key;
                continue;
            }
            const previous = fullTracks.find((t) => t.trackId === u.track.id) || fullTrackFor(fullTracks, u.track, album.artist);
            if (previous) {
                fullTracks = fullTracks.filter((t) => t !== previous);
                if (previous.key !== u.key) old.push(previous.key);
            }
            fullTracks.push({ trackId: u.track.id, title: u.track.title, key: u.key, size: u.size, position: u.position });
        }
        fullTracks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        tx.update(ref, { fullTracks, coverKey, updated_at: new Date().toISOString() });

        const stillUsed = new Set([...fullTracks.map((t) => t.key), coverKey]);
        return old.filter((k) => !stillUsed.has(k));
    });

    await Promise.all(replaced.map((k) => deleteObject(k).catch((err) => console.error('Old song not deleted:', k, err.message))));
    return getSongs(albumId);
}

// target: a track id or "cover"; the file is deleted from R2 too
export async function removeSong(albumId, target) {
    const album = await loadAlbum(albumId);
    let key;
    if (target === COVER) {
        key = album.coverKey;
        if (!key) throw new SongError(404, 'This album has no stored cover.');
        await ALBUMS.doc(album.id).update({ coverKey: null, updated_at: new Date().toISOString() });
    } else {
        const trackId = Number(target);
        let file = (album.fullTracks || []).find((t) => t.trackId === trackId);
        if (!file) {
            const track = (await tracksOf(album)).find((t) => t.id === trackId);
            file = track && fullTrackFor(album.fullTracks, track, album.artist);
        }
        if (!file) throw new SongError(404, 'This song has no file.');
        key = file.key;
        await ALBUMS.doc(album.id).update({
            fullTracks: album.fullTracks.filter((t) => t !== file),
            updated_at: new Date().toISOString(),
        });
    }
    await deleteObject(key).catch((err) => console.error('File not deleted:', key, err.message));
    return getSongs(albumId);
}

// When an album is deleted: its songs, cover and packed download go too
export async function deleteAlbumFiles(albumId) {
    const keys = (await listObjects(prefixOf(albumId))).map((o) => o.key);
    keys.push(`downloads/${albumId}.zip`);
    await Promise.all(keys.map((k) => deleteObject(k).catch(() => {})));
    return keys.length - 1;
}
