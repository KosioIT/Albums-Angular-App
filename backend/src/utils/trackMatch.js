import { makeSlug } from './slugify.js';

/*
  Matching audio files ("Welcome To The Jungle - Guns N' Roses.mp3") to Deezer tracks
  ("Welcome To The Jungle", "Back In Black (Remastered 2003)") by title.
*/

export const AUDIO_RE = /\.(mp3|m4a|aac|ogg|opus|flac|wav)$/i;

export const AUDIO_TYPES = {
    mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg',
    opus: 'audio/ogg', flac: 'audio/flac', wav: 'audio/wav',
};

export const audioType = (fileName) => AUDIO_TYPES[fileName.split('.').pop().toLowerCase()] || 'application/octet-stream';

// Words Deezer and rips add to the same song: "(Remastered 2008)", " - Live", "[Explicit]"
const EXTRA = /\s-\s(\d{4}\s)?(remaster|mono|stereo|single|radio|album|bonus|explicit|live|edit|version|mix).*$/i;

const slug = (text) => makeSlug(String(text).replace(/…|\.{2,}/g, ' ').replace(/&/g, ' and '));

/*
  The plain song title as a slug:
  "03 - Nightrain - Guns N' Roses.mp3" -> "nightrain", "Back In Black (Remastered)" -> "back-in-black"
*/
export function titleSlug(text, artist = '') {
    const artistSlug = artist ? slug(artist) : null;
    const name = String(text).split('/').pop().replace(AUDIO_RE, '').replace(/_/g, ' ');
    const parts = name
        .split(/\s+-\s+/)
        .map((p) => p.trim())
        .filter((p) => p && slug(p) !== artistSlug && !/^\d{1,3}\.?$/.test(p));
    const title = parts.join(' - ')
        .replace(/^\d{1,3}[\s.)_-]+(?=\D)/, '') // leading track number "01. ", "1) "
        .replace(EXTRA, '')
        .replace(/\(.*?\)|\[.*?\]/g, ' ');
    return slug(title);
}

/*
  files: [{ name, ... }], tracks: [{ id, title }]
  Every track gets at most one file: an exact title match first, then the only track whose
  title is the start of the file's (or the other way round). Nothing ambiguous is guessed.
  Returns { matched: [{ file, track }], unmatched: [files], missing: [tracks] }.
*/
export function matchTrackFiles(files, tracks, artist) {
    const free = new Map(tracks.map((t) => [t.id, { track: t, slug: titleSlug(t.title, artist) }]));
    const pending = files.map((file) => ({ file, slug: titleSlug(file.name, artist) }));
    const matched = [];

    const take = (rule) => {
        for (const p of pending.filter((x) => !x.done)) {
            const hits = [...free.values()].filter((t) => t.slug && p.slug && rule(p.slug, t.slug));
            if (hits.length !== 1) continue;
            matched.push({ file: p.file, track: hits[0].track });
            free.delete(hits[0].track.id);
            p.done = true;
        }
    };
    take((a, b) => a === b);
    take((a, b) => a.startsWith(`${b}-`) || b.startsWith(`${a}-`));

    return {
        matched,
        unmatched: pending.filter((p) => !p.done).map((p) => p.file),
        missing: [...free.values()].map((t) => t.track),
    };
}

/*
  The stored file for a Deezer track: album.fullTracks = [{ trackId, title, key }].
  By id first; by title when Deezer's album (and so its track ids) changed since the files were linked.
*/
export function fullTrackFor(fullTracks, track, artist) {
    if (!fullTracks?.length) return null;
    const byId = fullTracks.find((f) => f.trackId === track.id);
    if (byId) return byId;
    const wanted = titleSlug(track.title, artist);
    const byTitle = fullTracks.filter((f) => titleSlug(f.title, artist) === wanted);
    return byTitle.length === 1 ? byTitle[0] : null;
}
