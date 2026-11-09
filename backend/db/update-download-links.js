/*
  Sets album.downloadUrl from the archives in a public Mega folder.

    npm run seed:downloads                    shows what would change (nothing is written)
    npm run seed:downloads -- --write         saves the links
    npm run seed:downloads -- --write --overwrite   also replaces links that are already set

  The folder link is read from MEGA_ALBUMS_FOLDER_URL in backend/.env (or passed as an argument).
  Keep it out of git: anyone with it can download every archive, and the app hides download links on purpose.

  Each archive (.zip/.rar/.7z, subfolders included) is matched to an album by name: the album's slug
  must appear in the file path ("AC-DC - Black Ice (2008).zip" -> black-ice); the artist in the path
  breaks ties. Anything unmatched or ambiguous is listed so you can rename the file or set it by hand.
*/
import { File } from 'megajs';
import { loadEnv } from '../src/config/env/loadEnv.js';
import { makeSlug } from '../src/utils/slugify.js';

loadEnv();

const WRITE = process.argv.includes('--write');
const OVERWRITE = process.argv.includes('--overwrite');
const FOLDER_URL = process.argv.find((a) => a.startsWith('https://mega.nz/')) || process.env.MEGA_ALBUMS_FOLDER_URL;
const ARCHIVE_RE = /\.(zip|rar|7z)$/i;

const folderMatch = FOLDER_URL?.match(/^https:\/\/mega\.nz\/folder\/([\w-]+)#([\w-]+)/);
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

// "-a-b-" contains "-b-": whole slug words only, so "turbo" does not match "turbocharged"
const containsSlug = (haystack, needle) => `-${haystack}-`.includes(`-${needle}-`);

function bestAlbumFor(pathSlug, albums) {
    const scored = albums
        .filter((a) => containsSlug(pathSlug, a.id))
        .map((a) => ({ album: a, score: (containsSlug(pathSlug, makeSlug(a.artist)) ? 1000 : 0) + a.id.length }))
        .sort((x, y) => y.score - x.score);

    if (scored.length === 0) return { album: null };
    if (scored.length > 1 && scored[0].score === scored[1].score) {
        return { album: null, ambiguous: scored.filter((s) => s.score === scored[0].score).map((s) => s.album.id) };
    }
    return { album: scored[0].album };
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

    const plan = new Map(); // album id -> { album, archive, link }
    const unmatched = [];
    const ambiguous = [];
    const duplicates = [];

    for (const archive of archives) {
        const pathSlug = makeSlug(archive.path.replace(ARCHIVE_RE, ''));
        const { album, ambiguous: tied } = bestAlbumFor(pathSlug, albums);

        if (tied) ambiguous.push(`${archive.path}  ->  ${tied.join(' | ')}`);
        else if (!album) unmatched.push(archive.path);
        else if (plan.has(album.id)) duplicates.push(`${album.id}: "${plan.get(album.id).archive.path}" and "${archive.path}"`);
        else plan.set(album.id, { album, archive, link: fileLink(archive.file) });
    }
    // An album matched by two files gets neither; which one is right is your call
    duplicates.forEach((d) => plan.delete(d.split(':')[0]));

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
