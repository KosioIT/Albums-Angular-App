import { makeSlug } from '../utils/slugify.js';

/*
  30-second track previews from the public Deezer API (no key needed).
  The browser cannot call Deezer itself (no CORS), so the backend looks the album up and
  returns its tracks. Preview links are signed and expire, so results are cached only briefly.
*/

const DEEZER = 'https://api.deezer.com';
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map(); // albumId -> { at, value }

// "…" / "..." become spaces, so "Hardwired…To" and "Hardwired… to" give the same slug
const slug = (text) => makeSlug(String(text).replace(/\u2026|\.{2,}/g, ' '));
// "Appetite for Destruction (Super Deluxe Edition)" -> "appetite-for-destruction"
const baseSlug = (title) => slug(String(title).replace(/\(.*?\)|\[.*?\]/g, ' '));
// Words of bigger re-releases; avoided unless our own title has them
const EXTRA_EDITION = /deluxe|box-set|anniversary|expanded|super|collectors|\b\d{2}\b/;

async function deezer(path) {
    const res = await fetch(DEEZER + path, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Deezer HTTP ${res.status}`);
    const body = await res.json();
    if (body.error) throw new Error(`Deezer: ${body.error.message || body.error.type}`);
    return body;
}

/*
  Picks the Deezer album that matches ours (candidates: Deezer album objects with artist.name).
  The artist must match; then the exact title wins, then the title without "(...)" parts
  (Deezer adds "(Remastered 2015)" and the like), then a prefix ("Turbo" -> "Turbo 30").
  Among equals, plain editions beat deluxe / box-set ones, and shorter titles win.
*/
export function pickAlbum(candidates, album) {
    const artist = slug(album.artist);
    const full = slug(album.title);
    const base = baseSlug(album.title);
    const wantsExtra = EXTRA_EDITION.test(full);

    const score = (c) => {
        if (slug(c.artist?.name || '') !== artist) return 0;
        const cFull = slug(c.title);
        const cBase = baseSlug(c.title);
        if (cFull === full) return 40;
        if (cBase === base) return 30;
        if (cBase.startsWith(base + '-') || base.startsWith(cBase + '-')) return 10;
        return 0;
    };
    const penalty = (c) => (!wantsExtra && EXTRA_EDITION.test(slug(c.title)) ? 5 : 0);

    const ranked = candidates
        .map((c) => ({ c, s: score(c) - (score(c) ? penalty(c) : 0) }))
        .filter((x) => x.s > 0)
        .sort((x, y) => y.s - x.s || x.c.title.length - y.c.title.length);
    return ranked[0]?.c || null;
}

// All albums of the artist (more reliable than the search, which misses some catalogues)
async function artistAlbums(artistName) {
    const { data: artists = [] } = await deezer(`/search/artist?limit=5&q=${encodeURIComponent(artistName)}`);
    const artist = artists.find((a) => slug(a.name) === slug(artistName));
    if (!artist) return [];
    const { data = [] } = await deezer(`/artist/${artist.id}/albums?limit=300`);
    return data.map((a) => ({ ...a, artist: { name: artist.name } }));
}

async function findDeezerAlbumId(album) {
    const fromArtist = pickAlbum(await artistAlbums(album.artist), album);
    if (fromArtist) return fromArtist.id;

    const title = String(album.title).replace(/\(.*?\)/g, '').trim();
    const { data = [] } = await deezer(`/search/album?limit=25&q=${encodeURIComponent(`artist:"${album.artist}" album:"${title}"`)}`);
    return pickAlbum(data, album)?.id ?? null;
}

/*
  album: { id, title, artist, deezerAlbumId? }
  Returns { deezerAlbumId, tracks: [{ title, duration, preview, link }] } or null when Deezer has no such album.
  deezerAlbumId lets the caller remember the match (and an admin can set it by hand if the match is wrong).
*/
export async function getAlbumPreviews(album) {
    const hit = cache.get(album.id);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

    const deezerAlbumId = album.deezerAlbumId || (await findDeezerAlbumId(album));
    let value = null;

    if (deezerAlbumId) {
        const { data = [] } = await deezer(`/album/${deezerAlbumId}/tracks?limit=100`);
        const tracks = data
            .filter((t) => t.preview)
            .map((t) => ({ title: t.title, duration: t.duration, preview: t.preview, link: t.link }));
        value = tracks.length ? { deezerAlbumId, tracks } : null;
    }

    cache.set(album.id, { at: Date.now(), value });
    return value;
}
