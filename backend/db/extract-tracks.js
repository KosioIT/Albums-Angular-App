/*
  Takes the songs out of the album archives in R2 and stores them one by one, so logged-in users
  can play whole songs (guests keep the 30-second Deezer previews).

    npm run r2:tracks                      albums that have no songs yet
    npm run r2:tracks -- --dry-run         only shows how the files match the songs (nothing is uploaded)
    npm run r2:tracks -- --album=load      one album (its id)
    npm run r2:tracks -- --force           redo albums that already have songs

  Each song goes to "tracks/<album id>/<file name>" and is linked to the Deezer track with the same
  title (album.fullTracks). Files that match no song, or several, are listed and left out.
  The biggest image in the archive becomes the album's cover file (tracks/<album id>/cover.jpg),
  which goes into the album download; the download itself is packed from these files when
  someone first downloads the album (see src/services/albumZipService.js).
  After that the original archive is no longer needed: "npm run r2:cleanup" removes it.
  Run it after "npm run r2:upload" and "npm run seed" (the albums need their downloadKey).
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';
import { loadEnv } from '../src/config/env/loadEnv.js';
import { TRACKS_PREFIX } from './archiveMatch.js';
import { isStorageConfigured, listObjects, downloadStream, uploadStream } from '../src/services/storageService.js';
import { getAlbumPreviews } from '../src/services/previewService.js';
import { AUDIO_RE, audioType, matchTrackFiles } from '../src/utils/trackMatch.js';

loadEnv();

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const ONLY = process.argv.find((a) => a.startsWith('--album='))?.slice('--album='.length);

if (!isStorageConfigured()) {
    console.error('✘ Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET in backend/.env');
    process.exit(1);
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const openZip = (file) =>
    new Promise((resolve, reject) =>
        yauzl.open(file, { lazyEntries: true, autoClose: false }, (err, zip) => (err ? reject(err) : resolve(zip))),
    );

// Every entry of the archive (names and sizes only; nothing is unpacked yet)
const readEntries = (zip) =>
    new Promise((resolve, reject) => {
        const entries = [];
        zip.on('entry', (entry) => {
            entries.push(entry);
            zip.readEntry();
        });
        zip.on('end', () => resolve(entries));
        zip.on('error', reject);
        zip.readEntry();
    });

const entryStream = (zip, entry) =>
    new Promise((resolve, reject) => zip.openReadStream(entry, (err, stream) => (err ? reject(err) : resolve(stream))));

// Real files of the archive, without folders and the "__MACOSX" / "._x.mp3" files macOS adds
const isFile = (entry) => {
    const name = entry.fileName;
    return !name.endsWith('/') && !name.startsWith('__MACOSX/') && !name.split('/').pop().startsWith('._');
};
const isSong = (entry) => isFile(entry) && AUDIO_RE.test(entry.fileName);
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;
const IMAGE_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

async function processAlbum(album, ref, tmpDir) {
    const label = `${album.title} (${album.artist})`;
    if (!/\.zip$/i.test(album.downloadKey)) {
        console.log(`  - ${label}: only .zip archives can be unpacked (${album.downloadKey})`);
        return 'skipped';
    }

    const previews = await getAlbumPreviews(album);
    if (!previews) {
        console.log(`  - ${label}: not found on Deezer, so there are no songs to link the files to`);
        return 'skipped';
    }

    const zipFile = path.join(tmpDir, `${album.id}.zip`);
    process.stdout.write(`  ${label}: downloading ${album.downloadKey}... `);
    await pipeline(await downloadStream(album.downloadKey), fs.createWriteStream(zipFile));
    console.log(mb(fs.statSync(zipFile).size));

    const zip = await openZip(zipFile);
    try {
        const entries = await readEntries(zip);
        const songs = entries.filter(isSong);
        const cover = entries
            .filter((e) => isFile(e) && IMAGE_RE.test(e.fileName))
            .sort((a, b) => b.uncompressedSize - a.uncompressedSize)[0];
        const files = songs.map((entry) => ({ name: entry.fileName.split('/').pop(), entry }));
        const { matched, unmatched, missing } = matchTrackFiles(files, previews.tracks, album.artist);

        console.log(`    ${matched.length} of ${previews.tracks.length} song(s) matched, ${songs.length} file(s) in the archive`);
        unmatched.forEach((f) => console.log(`    ? file without a song: ${f.entry.fileName}`));
        missing.forEach((t) => console.log(`    ? song without a file: ${t.title}`));
        if (DRY_RUN) {
            matched.forEach(({ file, track }) => console.log(`    = ${track.title.padEnd(40)} <- ${file.name}`));
            return 'checked';
        }
        if (matched.length === 0) return 'skipped';

        const prefix = `${TRACKS_PREFIX}${album.id}/`;
        const existing = new Map((await listObjects(prefix)).map((o) => [o.key, o.size]));
        const upload = async (entry, key, type) => {
            if (existing.get(key) !== entry.uncompressedSize) await uploadStream(key, await entryStream(zip, entry), type);
        };

        const fullTracks = [];
        for (const { file, track } of matched) {
            const key = prefix + file.name;
            await upload(file.entry, key, audioType(file.name));
            // position: the song's place on the album, so the download is numbered in album order
            const position = previews.tracks.findIndex((t) => t.id === track.id);
            fullTracks.push({ trackId: track.id, title: track.title, key, size: file.entry.uncompressedSize, position });
        }
        fullTracks.sort((a, b) => a.position - b.position);

        let coverKey = null;
        if (cover) {
            const ext = cover.fileName.split('.').pop().toLowerCase().replace('jpeg', 'jpg');
            coverKey = `${prefix}cover.${ext}`;
            await upload(cover, coverKey, IMAGE_TYPES[ext]);
        }

        await ref.update({
            fullTracks,
            coverKey,
            deezerAlbumId: previews.deezerAlbumId,
            updated_at: new Date().toISOString(),
        });
        console.log(`    ✔ ${fullTracks.length} song(s) saved${coverKey ? ', with the cover' : ''}`);
        return 'done';
    } finally {
        zip.close();
        fs.rmSync(zipFile, { force: true });
    }
}

async function main() {
    const { db } = await import('../src/config/firebase/firebase.js');
    const ALBUMS = db.collection('albums');
    const docs = (await ALBUMS.get()).docs.filter((d) => !ONLY || d.id === ONLY);
    if (ONLY && docs.length === 0) throw new Error(`No album with id "${ONLY}"`);

    const albums = docs.map((d) => ({ id: d.id, ...d.data() }));
    const todo = albums.filter((a) => a.downloadKey && (FORCE || DRY_RUN || !a.fullTracks?.length));
    const noArchive = albums.filter((a) => !a.downloadKey);
    console.log(`${todo.length} album(s) to process${noArchive.length ? `, ${noArchive.length} without an archive` : ''}\n`);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'album-tracks-'));
    const results = { done: 0, checked: 0, skipped: 0, failed: 0 };
    try {
        for (const album of todo) {
            try {
                results[await processAlbum(album, ALBUMS.doc(album.id), tmpDir)]++;
            } catch (err) {
                results.failed++;
                console.log(`\n    ✘ ${album.title}: ${err.message}`);
            }
        }
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    console.log(
        DRY_RUN
            ? `\nDry run: ${results.checked} album(s) checked, nothing uploaded. Run without --dry-run to save the songs.`
            : `\n✔ ${results.done} album(s) with songs, ${results.skipped} skipped, ${results.failed} failed.`,
    );
    if (results.failed) process.exitCode = 1;
}

main()
    .then(() => process.exit(process.exitCode ?? 0))
    .catch((err) => {
        console.error('✘ Failed:', err.message);
        process.exit(1);
    });
