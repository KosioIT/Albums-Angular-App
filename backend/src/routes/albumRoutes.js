import express from 'express';
import { db } from '../config/firebase.js';
import { validateAlbumCreate, validateAlbumUpdate } from '../validators/albumsValidators.js';
import { getAllAlbums, filterAlbumsByValue } from '../controllers/albumController.js';

const router = express.Router();

// GET all albums
router.get('/albums', getAllAlbums);

//GET albums macthing certain criteria
router.get("/:filterField/:filterVal", filterAlbumsByValue);

//Create a new album
router.post('/albums', async (req, res) => {
  try {
    const album = req.body;
    const error = validateAlbumCreate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }
    const docRef = await db.collection('albums').add({
      ...album,
      created_at: new Date().toISOString()
    });

    res.json({ success: true, id: docRef.id });
  } catch (err) {
    console.error('Error creating album:', err);
    res.status(500).json({ success: false, message: 'Could not create album!' });
  }
});

//Update an existing album
router.put('/albums/:id', async (req, res) => {
  try {
    const error = validateAlbumUpdate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const docRef = db.collection('albums').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Album not found!' });
    }

    await docRef.update({
      ...req.body,
      updated_at: new Date().toISOString()
    });

    res.json({ success: true, message: 'Album updated successfully!' });
  } catch (err) {
    console.error('Error updating album:', err);
    res.status(500).json({ success: false, message: 'Could not update album!' });
  }
});

//Delete an album
router.delete('/albums/:id', async (req, res) => {
  try {
    const docRef = db.collection('albums').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Album not found!' });
    }

    await docRef.delete();
    res.json({ success: true, message: 'Album deleted successfully!' });
  } catch (err) {
    console.error('Error deleting album:', err);
    res.status(500).json({ success: false, message: 'Could not delete album!' });
  }
});

export default router;
