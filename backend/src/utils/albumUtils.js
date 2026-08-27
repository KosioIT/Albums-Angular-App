import { db } from '../config/firebase.js';
import { Album } from '../models/Album.js';

const ALBUMS = db.collection('albums');

// Get single album matching criteria
export async function getAlbumBy(field, value) {
  try {
    let doc;

    if (field === "id") {
      // Direct lookup by document ID
      const snapshot = await ALBUMS.doc(value).get();
      if (!snapshot.exists) return null;
      doc = snapshot;
    } else {
      // Query lookup by field
      const snapshot = await ALBUMS.where(field, '==', value).get();
      if (snapshot.empty) return null;
      doc = snapshot.docs[0];
    }

    return new Album(doc.data(), doc.id);

  } catch (err) {
    throw new Error(err.message);
  }
}

// Get array of albums matching criteria
export async function getFilteredAlbums(field, value) {
  try {
    const snapshot = await ALBUMS.where(field, '==', value).get();
    if (snapshot.empty) return [];

    return snapshot.docs.map(doc => new Album(doc.data(), doc.id));

  } catch (err) {
    throw new Error(err.message);
  }
}


export async function checkExistingAlbum(albumId) {
  const album = await getAlbumBy("id", albumId);
  return album !== null;
}
