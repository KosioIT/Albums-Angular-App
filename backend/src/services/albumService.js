import { db } from '../config/firebase/firebase.js';
import { Album } from '../models/Album.js';
import { makeSlug } from '../utils/slugify.js';

const ALBUMS = db.collection('albums');

export async function getAllAlbumsFromFirestore(){
  return await ALBUMS.get().then(snapshot => {
    return snapshot.docs.map(doc => new Album(doc.data(), doc.id).toPublic());
  });
}

export async function checkExistingAlbum(albumId) {
  const snapshot = await ALBUMS.doc(albumId).get();
  return snapshot.exists;
}

export async function loadOwnedAlbumOrThrow(user, albumId) {
  const album = await findAlbumById(albumId);

  if (!album) {
    throw new Error("NOT_FOUND");
  }

  if (!user || (user.role !== "admin" && album.createdBy !== user.id)) {
    throw new Error("UNAUTHORIZED");
  }

  return album;
}

// Fields that can be searched with GET /api/albums/:field/:value ("band" is the URL name for artist)
export const SEARCHABLE_FIELDS = { band: "artist", artist: "artist", title: "title", genre: "genre", rank: "rank" };

// One album (public form) or null
export async function findAlbumById(id) {
  const snapshot = await ALBUMS.doc(String(id)).get();
  return snapshot.exists ? new Album(snapshot.data(), snapshot.id).toPublic() : null;
}

const RANK_ORDER = { gold: 0, silver: 1, bronze: 2, common: 3 };
const releaseYear = (album) => Number(String(album.release_date || "").slice(-4)) || 0; // DD.MM.YYYY

// Gold, silver and bronze first, then the rest from the oldest release to the newest
export function sortByRank(albums) {
  return [...albums].sort(
    (a, b) => (RANK_ORDER[a.rank] ?? 3) - (RANK_ORDER[b.rank] ?? 3) || releaseYear(a) - releaseYear(b),
  );
}

// Always an array (empty when nothing matches), sorted by rank.
// The artist is matched by slug, so "Guns N Roses", "guns n' roses" and "Guns N' Roses" are the same band.
export async function findAlbums(field, value) {
  if (field === "artist") {
    const wanted = makeSlug(String(value));
    const all = await getAllAlbumsFromFirestore();
    return sortByRank(all.filter((album) => makeSlug(String(album.artist || "")) === wanted));
  }
  const querySnapshot = await ALBUMS.where(field, "==", value).get();
  return sortByRank(querySnapshot.docs.map(doc => new Album(doc.data(), doc.id).toPublic()));
}
