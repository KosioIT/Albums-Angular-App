/*
  Sets album.downloadUrl from the archives in a public Mega folder.

    npm run seed:downloads                    shows what would change (nothing is written)
    npm run seed:downloads -- --write         saves the links
    npm run seed:downloads -- --write --overwrite   also replaces links that are already set

  The folder link is read from MEGA_ALBUMS_FOLDER_URL in backend/.env (or passed as an argument).
  In .env it must be in double quotes, otherwise dotenv cuts it at "#" (the start of a comment).
  Keep it out of git: anyone with it can download every archive, and the app hides download links on purpose.

  Each archive (.zip/.rar/.7z, subfolders included) is matched to an album by name: the album's slug
  must appear in the file path ("kill_'em_all.zip" or "Metallica - Kill 'Em All.zip" -> kill-em-all);
  the artist in the path breaks ties. Anything unmatched or ambiguous is listed so you can rename the
  file or set it by hand (see megaMatch.js).
*/
import { File } from 'megajs';
import { loadEnv } from '../src/config/env/loadEnv.js';
import { ARCHIVE_RE, matchArchives } from './megaMatch.js';

loadEnv();

const WRITE = process.argv.includes('--write');
const OPTIONAL = process.argv.includes('--optional'); // part of "npm run seed": skip quietly when not configured
const OVERWRITE = process.argv.includes('--overwrite');
const FOLDER_URL = process.argv.find((a) => a.startsWith('https://mega.nz/')) || process.env.MEGA_ALBUMS_FOLDER_URL;

if (!FOLDER_URL && OPTIONAL) {
    console.log('Download links skipped: MEGA_ALBUMS_FOLDER_URL is not set in backend/.env');
    process.exit(0);
}

const folderMatch = FOLDER_URL?.match(/^https:\/\/mega\.nz\/folder\/([\w-]+)#([\w-]+)/);
if (!folderMatch && /^https:\/\/mega\.nz\/folder\/[\w-]+$/.test(FOLDER_URL || '')) {
    console.error('✘ The folder key (the part after "#") is missing. In .env put the link in double quotes:\n  MEGA_ALBUMS_FOLDER_URL="https://mega.nz/folder/<id>#<key>"');
    process.exit(1);
}
if (!folderMatch) {
    console.error('✘ Set MEGA_ALBUMS_FOLDER_URL in backend/.env to a public folder link (https://mega.nz/folder/<id>#<key>)');
    process.exit(1);
}
const [, folderHandle, folderKey] = folderMatch;

// Link to one file inside the shared folder; opens in Mega without an account
const fileLink = (file) => `https://mega.nz/folder/${folderHandle}#${folderKey}/file/${file.downloadId[1]}`;

function listArchives(node, path = []) {
    return (node.children || []).flatMap((child) =>
        child.directory
            ? listArchives(child, [...path, child.name])
            : ARCHIVE_RE.test(child.name) ? [{ file: child, path: [...path, child.name].join(' / ') }] : [],
    );
}

async function main() {
    console.log('Reading the Mega folder...');
    const root = File.fromURL(FOLDER_URL);
    await root.loadAttributes();
    const archives = listArchives(root);
    console.log(`Found ${archives.length} archive(s) in "${root.name}"\n`);

    const { db } = await import('../src/config/firebase/firebase.js');
    const ALBUMS = db.collection('albums');
    const albums = (await ALBUMS.get()).docs.map((d) => ({ id: d.id, ...d.data() }));

    const { matched, unmatched, ambiguous, duplicates } = matchArchives(archives, albums);
    const plan = new Map([...matched].map(([id, m]) => [id, { ...m, link: fileLink(m.archive.file) }]));

    const toWrite = [...plan.values()].filter((p) => OVERWRITE || !p.album.downloadUrl);
    const alreadySet = plan.size - toWrite.length;

    console.log('Matched:');
    for (const { album, archive } of plan.values()) {
        const mark = toWrite.some((p) => p.album.id === album.id) ? (album.downloadUrl ? '~' : '+') : '=';
        console.log(`  ${mark} ${album.id.padEnd(48)} <- ${archive.path}`);
    }
    const report = (title, list) => list.length && console.log(`\n${title} (${list.length}):\n  ${list.join('\n  ')}`);
    report('Files with no matching album', unmatched);
    report('Files that match several albums equally well', ambiguous);
    report('Albums matched by more than one file (skipped)', duplicates);
    report('Albums without a file', albums.filter((a) => !plan.has(a.id) && !a.downloadUrl).map((a) => `${a.id} (${a.artist})`));

    if (!WRITE) {
        console.log(`\nDry run: ${toWrite.length} link(s) would be saved${alreadySet ? `, ${alreadySet} already set (=)` : ''}. Run again with --write to save.`);
        return;
    }

    const batch = db.batch();
    const now = new Date().toISOString();
    toWrite.forEach(({ album, link }) => batch.update(ALBUMS.doc(album.id), { downloadUrl: link, updated_at: now }));
    await batch.commit();
    console.log(`\n✔ Saved ${toWrite.length} download link(s)${alreadySet ? `, kept ${alreadySet} existing (use --overwrite to replace them)` : ''}.`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('✘ Failed:', err.message);
        process.exit(1);
    });
