import { db } from '../config/firebase/firebase.js';
import { Album } from '../models/Album.js';
import { makeSlug } from '../utils/slugify.js';

const ALBUMS = db.collection('albums');

export async function getAllAlbumsFromFirestore(){
  return await ALBUMS.get();
}

export async function checkExistingAlbum(albumId) {
  const snapshot = await ALBUMS.doc(albumId).get();
  return snapshot.exists;
}

export async function findAlbums(field, value) {
  try {
    if (field === "id") {
      const snapshot = await ALBUMS.doc(value).get();
      if (!snapshot.exists) return null;
      return new Album(snapshot.data(), snapshot.id);
    }

    const querySnapshot = await ALBUMS.where(field, "==", value).get();
    if (querySnapshot.empty) return [];

    if (querySnapshot.docs.length === 1) {
      const doc = querySnapshot.docs[0];
      return new Album(doc.data(), doc.id);
    }

    return querySnapshot.docs.map(doc => new Album(doc.data(), doc.id));

  } catch (err) {
    throw new Error("Error fetching albums: " + err.message);
  }
}

export async function updateAlbumMegaUrl(albumTitle, megaUrl) {
  const slug = makeSlug(albumTitle);

  try {
    await ALBUMS.doc(slug).update({
      megaUrl
    });
    console.log(`✔ Firestore updated: ${slug} → ${megaUrl}`);
  } catch (err) {
    console.log("Error updating Firestore: ", err.message);
  }
}
