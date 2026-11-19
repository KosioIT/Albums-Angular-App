import { makeSlug } from '../src/utils/slugify.js';

// Matching archive files (in R2 or Mega) to albums by file name

export const ARCHIVE_RE = /\.(zip|rar|7z)$/i;

// Songs taken out of the archives ("npm run r2:tracks") live under this prefix in the bucket
export const TRACKS_PREFIX = 'tracks/';

// Only the album archives, not the single songs next to them
// Packed album downloads (see albumZipService) are under "downloads/"
export const isAlbumArchive = (key) => ARCHIVE_RE.test(key) && !key.startsWith(TRACKS_PREFIX) && !key.startsWith('downloads/');

// "kill_'em_all.zip" -> "kill-em-all"; "/" separates folders in the path
export const pathSlug = (path) => makeSlug(path.replace(ARCHIVE_RE, '').replace(/[_/]+/g, ' '));

// "-a-b-" contains "-b-": whole slug words only, so "load" does not match "reload"
const containsSlug = (haystack, needle) => `-${haystack}-`.includes(`-${needle}-`);

// "For Those About to Rock (We Salute You)" -> "for-those-about-to-rock"
const baseSlug = (title) => makeSlug(String(title).replace(/\(.*?\)/g, ' '));

/*
  The album's slug (its id) must appear in the file path, or its title without the "(...)" part
  ("for_those_about_to_rock.zip"); a full match beats a short one, the artist in the path breaks
  ties, then the longer (more specific) slug wins. Returns { album } or { ambiguous: [ids] } or {}.
*/
export function bestAlbumFor(slug, albums) {
    const scored = albums
        .map((a) => {
            const base = a.title ? baseSlug(a.title) : a.id;
            const artist = makeSlug(a.artist);
            const full = containsSlug(slug, a.id);
            // the short title alone is not enough when it is just the band's name ("Metallica")
            const short = !full && base && base !== a.id && base !== artist && containsSlug(slug, base);
            if (!full && !short) return null;
            const score = (containsSlug(slug, artist) ? 1000 : 0) + (full ? 500 : 0) + (full ? a.id : base).length;
            return { album: a, score };
        })
        .filter(Boolean)
        .sort((x, y) => y.score - x.score);

    if (scored.length === 0) return {};
    if (scored.length > 1 && scored[0].score === scored[1].score) {
        return { ambiguous: scored.filter((s) => s.score === scored[0].score).map((s) => s.album.id) };
    }
    return { album: scored[0].album };
}

/*
  archives: [{ path, link }], albums: [{ id, artist, ... }]
  Returns { matched: Map(albumId -> { album, archive }), unmatched, ambiguous, duplicates }.
  An album matched by two files gets neither; which one is right is the user's call.
*/
export function matchArchives(archives, albums) {
    const matched = new Map();
    const unmatched = [];
    const ambiguous = [];
    const duplicates = [];

    for (const archive of archives) {
        const { album, ambiguous: tied } = bestAlbumFor(pathSlug(archive.path), albums);
        if (tied) ambiguous.push(`${archive.path}  ->  ${tied.join(' | ')}`);
        else if (!album) unmatched.push(archive.path);
        else if (matched.has(album.id)) duplicates.push({ id: album.id, files: [matched.get(album.id).archive.path, archive.path] });
        else matched.set(album.id, { album, archive });
    }
    duplicates.forEach((d) => matched.delete(d.id));

    return {
        matched,
        unmatched,
        ambiguous,
        duplicates: duplicates.map((d) => `${d.id}: "${d.files.join('" and "')}"`),
    };
}
