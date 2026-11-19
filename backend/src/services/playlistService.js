import { db } from '../config/firebase/firebase.js';
import { getAlbumPreviews } from './previewService.js';

/*
  Playlists of tracks (30-second Deezer previews) from any album.
  playlists/{id}: { ownerId, ownerName, name, description, isPublic, tracks: [{ albumId, trackId, title, duration }],
                    created_at, updated_at }
  Tracks are stored by album + Deezer track id; the preview links expire, so they are looked up when played.
*/

const PLAYLISTS = db.collection('playlists');
const ALBUMS = db.collection('albums');

export const MAX_PLAYLISTS_PER_USER = 50;
export const MAX_TRACKS = 200;

// Errors the controller turns into HTTP answers
export class PlaylistError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const now = () => new Date().toISOString();

async function albumsById(ids) {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map();
    const docs = await db.getAll(...unique.map((id) => ALBUMS.doc(id)));
    return new Map(docs.filter((d) => d.exists).map((d) => [d.id, { id: d.id, ...d.data() }]));
}

// What a client may see; tracks get their album's title, artist and cover
async function toPublic(doc, { withTracks = true } = {}) {
    const p = doc.data();
    const base = {
        id: doc.id,
        name: p.name,
        description: p.description || '',
        isPublic: !!p.isPublic,
        ownerId: p.ownerId,
        ownerName: p.ownerName,
        trackCount: (p.tracks || []).length,
        duration: (p.tracks || []).reduce((s, t) => s + (t.duration || 0), 0),
        created_at: p.created_at,
        updated_at: p.updated_at,
    };
    const albums = await albumsById((p.tracks || []).map((t) => t.albumId));
    const withAlbum = (t) => {
        const a = albums.get(t.albumId);
        return { ...t, albumTitle: a?.title ?? null, artist: a?.artist ?? null, cover_img_url: a?.cover_img_url ?? null };
    };
    // a few covers for the playlist card
    base.covers = [...new Set((p.tracks || []).map((t) => albums.get(t.albumId)?.cover_img_url).filter(Boolean))].slice(0, 4);
    if (withTracks) base.tracks = (p.tracks || []).map(withAlbum);
    return base;
}

async function load(id) {
    const doc = await PLAYLISTS.doc(String(id)).get();
    if (!doc.exists) throw new PlaylistError(404, 'Playlist not found!');
    return doc;
}

// Owner check: a private playlist looks like it does not exist to anyone else
async function loadOwned(id, user) {
    const doc = await load(id);
    if (doc.data().ownerId !== user?.id) {
        throw new PlaylistError(doc.data().isPublic ? 403 : 404, doc.data().isPublic ? 'Only the owner can change this playlist!' : 'Playlist not found!');
    }
    return doc;
}

async function loadVisible(id, user) {
    const doc = await load(id);
    const p = doc.data();
    if (!p.isPublic && p.ownerId !== user?.id) throw new PlaylistError(404, 'Playlist not found!');
    return doc;
}

const newestFirst = (a, b) => (b.updated_at || '').localeCompare(a.updated_at || '');

export async function listMine(user) {
    const snap = await PLAYLISTS.where('ownerId', '==', user.id).get();
    const list = await Promise.all(snap.docs.map((d) => toPublic(d, { withTracks: false })));
    return list.sort(newestFirst);
}

export async function listPublic() {
    const snap = await PLAYLISTS.where('isPublic', '==', true).get();
    const list = await Promise.all(snap.docs.map((d) => toPublic(d, { withTracks: false })));
    return list.filter((p) => p.trackCount > 0).sort(newestFirst);
}

export async function getPlaylist(id, user) {
    return toPublic(await loadVisible(id, user));
}

export async function createPlaylist(user, { name, description = '', isPublic = false }) {
    const mine = await PLAYLISTS.where('ownerId', '==', user.id).get();
    if (mine.size >= MAX_PLAYLISTS_PER_USER) {
        throw new PlaylistError(400, `You can have at most ${MAX_PLAYLISTS_PER_USER} playlists.`);
    }
    const ref = PLAYLISTS.doc();
    await ref.set({
        ownerId: user.id,
        ownerName: user.username,
        name,
        description,
        isPublic: !!isPublic,
        tracks: [],
        created_at: now(),
        updated_at: now(),
    });
    return toPublic(await ref.get());
}

export async function updatePlaylist(id, user, changes) {
    const doc = await loadOwned(id, user);
    const data = {};
    for (const field of ['name', 'description', 'isPublic']) {
        if (changes[field] !== undefined) data[field] = field === 'isPublic' ? !!changes[field] : changes[field];
    }
    await doc.ref.update({ ...data, updated_at: now() });
    return toPublic(await doc.ref.get());
}

export async function deletePlaylist(id, user) {
    const doc = await loadOwned(id, user);
    await doc.ref.delete();
}

// The track must really be on that album (checked against its Deezer tracks), so no made-up entries
export async function addTrack(id, user, albumId, trackId) {
    const doc = await loadOwned(id, user);
    const albumDoc = await ALBUMS.doc(String(albumId)).get();
    if (!albumDoc.exists) throw new PlaylistError(404, 'Album not found!');

    const previews = await getAlbumPreviews({ id: albumDoc.id, ...albumDoc.data() });
    const track = previews?.tracks.find((t) => t.id === Number(trackId));
    if (!track) throw new PlaylistError(404, 'Track not found on this album!');

    return db.runTransaction(async (t) => {
        const fresh = await t.get(doc.ref);
        const tracks = fresh.data().tracks || [];
        if (tracks.some((x) => x.trackId === track.id)) throw new PlaylistError(409, 'This track is already in the playlist.');
        if (tracks.length >= MAX_TRACKS) throw new PlaylistError(400, `A playlist can have at most ${MAX_TRACKS} tracks.`);
        const entry = { albumId: albumDoc.id, trackId: track.id, title: track.title, duration: track.duration };
        t.update(doc.ref, { tracks: [...tracks, entry], updated_at: now() });
        return entry;
    });
}

export async function removeTrack(id, user, trackId) {
    const doc = await loadOwned(id, user);
    await db.runTransaction(async (t) => {
        const tracks = (await t.get(doc.ref)).data().tracks || [];
        const rest = tracks.filter((x) => x.trackId !== Number(trackId));
        if (rest.length === tracks.length) throw new PlaylistError(404, 'Track not in the playlist!');
        t.update(doc.ref, { tracks: rest, updated_at: now() });
    });
    return toPublic(await doc.ref.get());
}

// order: every track id of the playlist, in the new order
export async function reorderTracks(id, user, order) {
    const doc = await loadOwned(id, user);
    await db.runTransaction(async (t) => {
        const tracks = (await t.get(doc.ref)).data().tracks || [];
        const ids = order.map(Number);
        const same = ids.length === tracks.length && new Set(ids).size === ids.length && tracks.every((x) => ids.includes(x.trackId));
        if (!same) throw new PlaylistError(400, 'The new order must list every track of the playlist once.');
        const byId = new Map(tracks.map((x) => [x.trackId, x]));
        t.update(doc.ref, { tracks: ids.map((i) => byId.get(i)), updated_at: now() });
    });
    return toPublic(await doc.ref.get());
}

// Fresh preview links for the player, in playlist order; tracks Deezer no longer has are skipped
export async function getPlaylistPreviews(id, user) {
    const playlist = await toPublic(await loadVisible(id, user));
    const albums = await albumsById(playlist.tracks.map((t) => t.albumId));
    const previewsByAlbum = new Map();
    for (const albumId of new Set(playlist.tracks.map((t) => t.albumId))) {
        const album = albums.get(albumId);
        previewsByAlbum.set(albumId, album ? await getAlbumPreviews(album) : null);
    }
    const tracks = playlist.tracks
        .map((t) => {
            const p = previewsByAlbum.get(t.albumId)?.tracks.find((x) => x.id === t.trackId);
            return p && { ...p, albumId: t.albumId, albumTitle: t.albumTitle, artist: t.artist, cover_img_url: t.cover_img_url };
        })
        .filter(Boolean);
    return { playlist: { id: playlist.id, name: playlist.name, ownerName: playlist.ownerName }, tracks };
}
