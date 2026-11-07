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
  const album = await findAlbums("id", albumId);

  if (!album) {
    throw new Error("NOT_FOUND");
  }

  if (!user || (user.role !== "admin" && album.createdBy !== user.id)) {
    throw new Error("UNAUTHORIZED");
  }

  return album;
}


export async function findAlbums(field, value) {
  try {
    if (field === "id") {
      const snapshot = await ALBUMS.doc(value).get();
      if (!snapshot.exists) return null;
      return new Album(snapshot.data(), snapshot.id).toPublic();
    }

    const querySnapshot = await ALBUMS.where(field, "==", value).get();
    if (querySnapshot.empty) return [];

    if (querySnapshot.docs.length === 1) {
      const doc = querySnapshot.docs[0];
      return new Album(doc.data(), doc.id).toPublic();
    }

    return querySnapshot.docs.map(doc => new Album(doc.data(), doc.id).toPublic());

  } catch (err) {
    throw new Error("Error fetching albums: " + err.message);
  }
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
