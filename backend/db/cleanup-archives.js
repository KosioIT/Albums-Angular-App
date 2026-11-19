/*
  Removes the original album archives from R2 once their songs are stored one by one
  ("npm run r2:tracks"): downloads are packed from the songs, so the archive is just a second copy.

    npm run r2:cleanup              lists what would be removed (nothing is deleted)
    npm run r2:cleanup -- --delete  deletes those archives and clears album.downloadKey

  Albums whose songs are not stored yet keep their archive (it is still their download).
*/
import { FieldValue } from 'firebase-admin/firestore';
import { loadEnv } from '../src/config/env/loadEnv.js';
import { deleteObject, isStorageConfigured, objectSize } from '../src/services/storageService.js';

loadEnv();

const DELETE = process.argv.includes('--delete');

if (!isStorageConfigured()) {
    console.error('✘ Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET in backend/.env');
    process.exit(1);
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

async function main() {
    const { db } = await import('../src/config/firebase/firebase.js');
    const ALBUMS = db.collection('albums');
    const albums = (await ALBUMS.get()).docs.map((d) => ({ id: d.id, ...d.data() }));

    const done = albums.filter((a) => a.downloadKey && a.fullTracks?.length);
    const waiting = albums.filter((a) => a.downloadKey && !a.fullTracks?.length);

    let total = 0;
    console.log(`Archives no longer needed (${done.length}):`);
    for (const a of done) {
        const size = await objectSize(a.downloadKey);
        total += size ?? 0;
        console.log(`  ${a.downloadKey.padEnd(50)} ${size === null ? '(already gone)' : mb(size)}  ${a.fullTracks.length} song(s) stored`);
    }
    if (waiting.length) {
        console.log(`\nKept, the songs are not stored yet (${waiting.length}):\n  ${waiting.map((a) => a.downloadKey).join('\n  ')}`);
    }

    if (!DELETE) {
        console.log(`\nDry run: ${done.length} archive(s), ${mb(total)} would be freed. Run again with --delete to remove them.`);
        return;
    }
    for (const a of done) {
        await deleteObject(a.downloadKey);
        await ALBUMS.doc(a.id).update({ downloadKey: FieldValue.delete(), updated_at: new Date().toISOString() });
    }
    console.log(`\n✔ Removed ${done.length} archive(s), ${mb(total)} freed.`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('✘ Failed:', err.message);
        process.exit(1);
    });
