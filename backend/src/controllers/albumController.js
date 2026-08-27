import { db } from '../config/firebase.js';
import { Album } from '../models/Album.js';

const ALBUMS = db.collection('albums');
//const USERS = db.collection('users');

/**
 * GET all albums
 */
export const getAlbums = async (_req, res) => {
  try {
    const snapshot = await ALBUMS.get();

    const albums = snapshot.docs.map(doc => {
      const album = new Album(doc.data(), doc.id);
      return album;
    });

    res.json({ success: true, data: albums });
  } catch (err) {
    console.error('Get albums error:', err);
    res.status(500).json({ message: 'Server error!' });
  }
};

/**
 * GET album by ID
 */
export const getAlbumById = async (req, res) => {
  try {
    const doc = await ALBUMS.doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Album not found!' });
    }

    const album = new Album(doc.data(), doc.id);

    res.json({ success: true, data: album });
  } catch (err) {
    console.error('Get album error:', err);
    res.status(500).json({ message: 'Server error!' });
  }
};

/**
 * CREATE album
 */
export const createAlbum = async (req, res) => {
  try {
    const { title, artist, genre, release_date, rank, producers, tracks } = req.body;

    // req.user comes from protect middleware → User Class
    const createdBy = req.user.id;

    const album = new Album({
      title,
      artist,
      genre,
      release_date,
      rank,
      producers,
      tracks,
      createdBy
    });

    const docRef = await ALBUMS.add(album.toFirestore());

    res.status(201).json({ success: true, id: docRef.id });
  } catch (err) {
    console.error('Create album error:', err);
    res.status(400).json({ message: 'Invalid data!' });
  }
};

/**
 * UPDATE album
 */
export const updateAlbum = async (req, res) => {
  try {
    const doc = await ALBUMS.doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Album not found!' });
    }

    const album = new Album(doc.data(), doc.id);

    // Check ownership
    if (album.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized!' });
    }

    album.update(req.body);

    await ALBUMS.doc(album.id).update(album.toFirestore());

    res.json({ success: true, message: 'Album updated successfully!', data: album });
  } catch (err) {
    console.error('Update album error:', err);
    res.status(400).json({ message: 'Invalid data!' });
  }
};

/**
 * DELETE album
 */
export const deleteAlbum = async (req, res) => {
  try {
    const doc = await ALBUMS.doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Album not found!' });
    }

    const album = new Album(doc.data(), doc.id);

    // Check ownership
    if (album.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized!' });
    }

    await ALBUMS.doc(album.id).delete();

    res.json({ success: true, message: 'Album removed successfully!' });
  } catch (err) {
    console.error('Delete album error:', err);
    res.status(500).json({ message: 'Server error!' });
  }
};
