import crypto from 'node:crypto';
import yazl from 'yazl';
import { db } from '../config/firebase/firebase.js';
import { createDownloadLink, downloadStream, objectSize, uploadStream } from './storageService.js';

/*
  Album downloads, made from the songs themselves.

  The songs (and the cover) are kept one by one in R2: tracks/<album id>/... (see "npm run r2:tracks").
  The first download of an album packs them into downloads/<album id>.zip, also in R2; later downloads
  get a link to that file, so they come straight from Cloudflare. When the songs or the cover change,
  the fingerprint changes and the next download packs the album again. Firestore keeps only the
  fingerprint (album.zipCache), R2 keeps the files.
*/

export const ZIP_PREFIX = 'downloads/';
const ALBUMS = db.collection('albums');
const packing = new Map(); // album id -> promise, so two downloads at once pack the album only once

export const hasSongs = (album) => (album.fullTracks?.length ?? 0) > 0;

// Songs in album order (position = place on the Deezer album; older entries keep their order)
const inOrder = (fullTracks) =>
    fullTracks
        .map((t, i) => ({ t, i }))
        .sort((a, b) => (a.t.position ?? a.i) - (b.t.position ?? b.i))
        .map(({ t }) => t);

// Characters that file systems refuse: "AC/DC - Back in Black" -> "AC-DC - Back in Black"
export const safeFileName = (name) => name.replace(/[\\/]+/g, '-').replace(/[<>:"|?*\x00-\x1f]/g, '').trim();

export const zipFileName = (album) => safeFileName(`${album.artist} - ${album.title}.zip`);

// What the archive is made of; another value means the stored archive is out of date
export function zipFingerprint(album) {
    const parts = {
        format: 2, // raise when the way albums are packed changes, so stored zips are packed again
        title: album.title,
        artist: album.artist,
        songs: inOrder(album.fullTracks).map((t) => [t.key, t.size]),
        cover: album.coverKey || album.cover_img_url || null,
    };
    return crypto.createHash('sha1').update(JSON.stringify(parts)).digest('hex');
}

// "03 - Nightrain - Guns N' Roses.mp3": the stored file name, numbered in album order
export function entryNames(album) {
    return inOrder(album.fullTracks).map((t, i) => {
        // an old number only with punctuation after it ("01 - ", "01. ", "1) "), so "2 x 4" keeps its name
        const base = t.key.split('/').pop().replace(/^\d{1,3}\s*[.)_-]\s*(?=\D)/, '');
        return { key: t.key, name: `${String(i + 1).padStart(2, '0')} - ${base}` };
    });
}

// The cover from R2, or else the album's cover image (Deezer); an album without one is packed without it
async function coverBuffer(album) {
    try {
        if (album.coverKey) {
            const chunks = [];
            for await (const chunk of await downloadStream(album.coverKey)) chunks.push(chunk);
            return { buffer: Buffer.concat(chunks), ext: album.coverKey.split('.').pop().toLowerCase() };
        }
        if (album.cover_img_url) {
            const res = await fetch(album.cover_img_url, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) return null;
            const ext = (res.headers.get('content-type') || '').includes('png') ? 'png' : 'jpg';
            return { buffer: Buffer.from(await res.arrayBuffer()), ext };
        }
    } catch (err) {
        console.error(`Cover for ${album.id} skipped:`, err.message);
    }
    return null;
}

async function pack(album, key, fingerprint) {
    const zip = new yazl.ZipFile();
    // mp3 is already compressed: storing the files as they are is fast and almost as small
    for (const { key: songKey, name } of entryNames(album)) {
        zip.addReadStreamLazy(name, { compress: false }, (cb) =>
            downloadStream(songKey).then((stream) => cb(null, stream), cb),
        );
    }
    const cover = await coverBuffer(album);
    if (cover) zip.addBuffer(cover.buffer, `cover.${cover.ext}`, { compress: false });
    zip.end();

    const failed = new Promise((_, reject) => zip.on('error', reject));
    await Promise.race([uploadStream(key, zip.outputStream, 'application/zip'), failed]);

    const size = await objectSize(key);
    await ALBUMS.doc(album.id).update({ zipCache: { key, fingerprint, size, packed_at: new Date().toISOString() } });
}

async function ensureZip(album) {
    const key = `${ZIP_PREFIX}${album.id}.zip`;
    const fingerprint = zipFingerprint(album);
    const fresh = album.zipCache?.key === key && album.zipCache.fingerprint === fingerprint;
    if (fresh && (await objectSize(key)) !== null) return key; // also repacked if someone deleted the file

    if (!packing.has(album.id)) {
        packing.set(album.id, pack(album, key, fingerprint).finally(() => packing.delete(album.id)));
    }
    await packing.get(album.id);
    return key;
}

/*
  One-minute link for downloading the album, or null when there is nothing to download.
  album: { id, ...Firestore data }. Albums whose songs are not stored yet keep their old archive (downloadKey).
*/
export async function albumDownloadLink(album) {
    if (hasSongs(album)) return createDownloadLink(await ensureZip(album), zipFileName(album));
    if (album.downloadKey) return createDownloadLink(album.downloadKey, zipFileName(album));
    return null;
}
