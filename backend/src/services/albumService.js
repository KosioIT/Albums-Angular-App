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

// Always an array (empty when nothing matches), whatever the number of results
export async function findAlbums(field, value) {
  const querySnapshot = await ALBUMS.where(field, "==", value).get();
  return querySnapshot.docs.map(doc => new Album(doc.data(), doc.id).toPublic());
}

export async function updateAlbumDownloadUrl(albumTitle, downloadUrl) {
  const slug = makeSlug(albumTitle);

  try {
    await ALBUMS.doc(slug).update({
      downloadUrl
    });
    console.log(`✔ Firestore updated: ${slug} → ${downloadUrl}`);
  } catch (err) {
    console.log("Error updating Firestore: ", err.message);
  }
}
