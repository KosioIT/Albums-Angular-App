import { makeSlug } from '../src/utils/slugify.js';

// Matching Mega archives to albums (used by update-download-links.js)

export const ARCHIVE_RE = /\.(zip|rar|7z)$/i;

// "kill_'em_all.zip" -> "kill-em-all"; "/" separates folders in the path
export const pathSlug = (path) => makeSlug(path.replace(ARCHIVE_RE, '').replace(/[_/]+/g, ' '));

// "-a-b-" contains "-b-": whole slug words only, so "load" does not match "reload"
const containsSlug = (haystack, needle) => `-${haystack}-`.includes(`-${needle}-`);

/*
  The album's slug (its id) must appear in the file path; the artist in the path breaks ties,
  then the longer (more specific) id wins. Returns { album } or { ambiguous: [ids] } or {}.
*/
export function bestAlbumFor(slug, albums) {
    const scored = albums
        .filter((a) => containsSlug(slug, a.id))
        .map((a) => ({ album: a, score: (containsSlug(slug, makeSlug(a.artist)) ? 1000 : 0) + a.id.length }))
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
