/*
  Copies the album archives from the public Mega folder into the R2 bucket (one-off, or when new
  archives are added to Mega). The object key is the file path in the folder, e.g. "load.zip".

    npm run r2:upload              copies archives that are missing in R2 (or have another size)
    npm run r2:upload -- --dry-run only lists what would be copied

  backend/.env: MEGA_ALBUMS_FOLDER_URL (in double quotes) and the R2_* settings.
  After copying, run "npm run seed" (or "npm run seed:downloads -- --write") to link the albums.
*/
import { File } from 'megajs';
import { loadEnv } from '../src/config/env/loadEnv.js';
import { ARCHIVE_RE } from './archiveMatch.js';
import { isStorageConfigured, objectSize, uploadStream } from '../src/services/storageService.js';

loadEnv();

const DRY_RUN = process.argv.includes('--dry-run');
const FOLDER_URL = process.env.MEGA_ALBUMS_FOLDER_URL;

if (!/^https:\/\/mega\.nz\/folder\/[\w-]+#[\w-]+/.test(FOLDER_URL || '')) {
    console.error('✘ Set MEGA_ALBUMS_FOLDER_URL in backend/.env, in double quotes: "https://mega.nz/folder/<id>#<key>"');
    process.exit(1);
}
if (!isStorageConfigured()) {
    console.error('✘ Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET in backend/.env');
    process.exit(1);
}

function listArchives(node, path = []) {
    return (node.children || []).flatMap((child) =>
        child.directory
            ? listArchives(child, [...path, child.name])
            : ARCHIVE_RE.test(child.name) ? [{ file: child, key: [...path, child.name].join('/') }] : [],
    );
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

async function main() {
    console.log('Reading the Mega folder...');
    const root = File.fromURL(FOLDER_URL);
    await root.loadAttributes();
    const archives = listArchives(root);
    console.log(`Found ${archives.length} archive(s)\n`);

    let copied = 0, skipped = 0, failed = 0;
    for (const { file, key } of archives) {
        if ((await objectSize(key)) === file.size) {
            skipped++;
            continue;
        }
        if (DRY_RUN) {
            console.log(`  would copy ${key} (${mb(file.size)})`);
            continue;
        }
        process.stdout.write(`  ${key} (${mb(file.size)})... `);
        try {
            await uploadStream(key, file.download());
            copied++;
            console.log('done');
        } catch (err) {
            failed++;
            console.log(`FAILED: ${err.message}`);
        }
    }

    if (DRY_RUN) console.log(`\nDry run: ${skipped} already in R2. Run without --dry-run to copy.`);
    else console.log(`\n${failed ? '✘' : '✔'} Copied ${copied}, already in R2 ${skipped}${failed ? `, failed ${failed} (run again to retry)` : ''}.`);
    if (failed) process.exitCode = 1;
}

main()
    .catch((err) => {
        console.error('✘ Failed:', err.message);
        process.exitCode = 1;
    })
    .finally(() => process.exit());
