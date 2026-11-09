/*
  Links albums to their archives in the R2 bucket (album.downloadKey), matching by file name:
  the album's slug must appear in the file path ("kill_'em_all.zip" -> kill-em-all), see archiveMatch.js.

    npm run seed:downloads                          shows what would change (nothing is written)
    npm run seed:downloads -- --write               saves the links
    npm run seed:downloads -- --write --overwrite   also replaces links that are already set

  Anything unmatched or ambiguous is listed, never guessed: rename the file or set downloadKey by hand.
  The archives get into R2 with "npm run r2:upload" (copies them from the Mega folder).
*/
import { FieldValue } from 'firebase-admin/firestore';
import { loadEnv } from '../src/config/env/loadEnv.js';
import { matchArchives } from './archiveMatch.js';
import { isStorageConfigured, listObjects } from '../src/services/storageService.js';

loadEnv();

const WRITE = process.argv.includes('--write');
const OVERWRITE = process.argv.includes('--overwrite');
const OPTIONAL = process.argv.includes('--optional'); // part of "npm run seed": skip quietly when R2 is not set up

if (!isStorageConfigured()) {
    const message = 'R2 is not configured (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET in backend/.env)';
    if (OPTIONAL) {
        console.log(`Download links skipped: ${message}`);
        process.exit(0);
    }
    console.error(`✘ ${message}`);
    process.exit(1);
}

async function main() {
    const objects = await listObjects();
    console.log(`Found ${objects.length} file(s) in the R2 bucket\n`);

    const { db } = await import('../src/config/firebase/firebase.js');
    const ALBUMS = db.collection('albums');
    const albums = (await ALBUMS.get()).docs.map((d) => ({ id: d.id, ...d.data() }));

    const archives = objects.map((o) => ({ path: o.key, key: o.key }));
    const { matched, unmatched, ambiguous, duplicates } = matchArchives(archives, albums);

    const changes = [...matched.values()].filter(({ album, archive }) => album.downloadKey !== archive.key);
    const toWrite = changes.filter(({ album }) => OVERWRITE || !album.downloadKey);
    const kept = changes.length - toWrite.length;

    console.log('Matched:');
    for (const { album, archive } of matched.values()) {
        const mark = album.downloadKey === archive.key ? '=' : toWrite.some((c) => c.album.id === album.id) ? (album.downloadKey ? '~' : '+') : '!';
        console.log(`  ${mark} ${album.id.padEnd(48)} <- ${archive.key}`);
    }
    const report = (title, list) => list.length && console.log(`\n${title} (${list.length}):\n  ${list.join('\n  ')}`);
    report('Files with no matching album', unmatched);
    report('Files that match several albums equally well', ambiguous);
    report('Albums matched by more than one file (skipped)', duplicates);
    report('Albums without a file', albums.filter((a) => !matched.has(a.id) && !a.downloadKey).map((a) => `${a.id} (${a.artist})`));

    if (!WRITE) {
        console.log(`\nDry run: ${toWrite.length} link(s) would be saved${kept ? `, ${kept} different existing link(s) kept (!)` : ''}. Run again with --write to save.`);
        return;
    }

    const batch = db.batch();
    const now = new Date().toISOString();
    // downloadUrl was the old Mega link; it is removed so no album points to Mega any more
    toWrite.forEach(({ album, archive }) =>
        batch.update(ALBUMS.doc(album.id), { downloadKey: archive.key, downloadUrl: FieldValue.delete(), updated_at: now }),
    );
    await batch.commit();
    console.log(`\n✔ Saved ${toWrite.length} download link(s)${kept ? `, kept ${kept} existing (use --overwrite to replace them)` : ''}.`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('✘ Failed:', err.message);
        process.exit(1);
    });
