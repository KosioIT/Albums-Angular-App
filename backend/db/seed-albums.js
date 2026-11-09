/*
  Seeds the "albums" collection from albums.data.js.

    npm run seed:albums              adds albums that are not in the database yet
    npm run seed:albums -- --check   only validates the data, does not touch the database
    npm run seed:albums -- --force   also overwrites the metadata of existing albums
                                     (likes, listens, downloads, downloadKey and deezerAlbumId are kept)

  Every album goes through the same validators as POST /api/albums.
*/
import { Album } from '../src/models/Album.js';
import { albums } from './albums.data.js';
import { validateAlbum } from './validateAlbum.js';

const CHECK_ONLY = process.argv.includes('--check');
const FORCE = process.argv.includes('--force');
const PRUNE = process.argv.includes('--prune');

// Fields the app changes at runtime; a re-seed must never reset them
const RUNTIME_FIELDS = ['likes', 'listens', 'downloads', 'downloadKey', 'deezerAlbumId', 'created_at', 'createdBy'];

async function buildAlbums() {
    const problems = [];
    const byId = new Map();

    for (const raw of albums) {
        const { data, errors } = await validateAlbum(raw);
        if (errors) {
            problems.push(`"${raw.title}":\n    ${errors.join('\n    ')}`);
            continue;
        }
        const album = new Album(data);
        if (byId.has(album.id)) {
            problems.push(`"${raw.title}": id "${album.id}" is already used by "${byId.get(album.id).title}"`);
            continue;
        }
        byId.set(album.id, album);
    }

    if (problems.length) {
        console.error(`✘ ${problems.length} album(s) are invalid, nothing was written:\n  ${problems.join('\n  ')}`);
        process.exit(1);
    }
    return [...byId.values()];
}

async function seed(list) {
    // Imported here so --check works without the Firebase service account key
    const { db } = await import('../src/config/firebase/firebase.js');
    const ALBUMS = db.collection('albums');

    const counts = { created: 0, updated: 0, skipped: 0 };

    for (const album of list) {
        const ref = ALBUMS.doc(album.id);
        const snap = await ref.get();

        if (!snap.exists) {
            await ref.create(album.toFirestore());
            counts.created++;
            console.log(`  + ${album.id}`);
        } else if (FORCE) {
            const metadata = album.toFirestore();
            RUNTIME_FIELDS.forEach((field) => delete metadata[field]);
            await ref.update({ ...metadata, updated_at: new Date().toISOString() });
            counts.updated++;
            console.log(`  ~ ${album.id}`);
        } else {
            counts.skipped++;
        }
    }

    if (PRUNE) {
        const keep = new Set(list.map((a) => a.id));
        const stale = (await ALBUMS.get()).docs.filter((d) => !keep.has(d.id) && !d.data().createdBy);
        for (const doc of stale) {
            await doc.ref.delete();
            console.log(`  - ${doc.id}`);
        }
        counts.deleted = stale.length;
    }

    console.log(`\n✔ Created ${counts.created}, updated ${counts.updated}, skipped ${counts.skipped} (already in the database${FORCE ? '' : '; use --force to update them'})${PRUNE ? `, deleted ${counts.deleted}` : ''}`);
}

const list = await buildAlbums();
console.log(`✔ ${list.length} albums are valid`);

if (CHECK_ONLY) {
    list.forEach((a) => console.log(`  ${a.id.padEnd(50)} ${a.artist}`));
} else {
    try {
        await seed(list);
    } catch (err) {
        console.error('✘ Seeding failed:', err.message);
        process.exit(1);
    }
}
process.exit(0);
