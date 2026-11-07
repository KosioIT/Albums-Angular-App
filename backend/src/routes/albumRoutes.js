import express from 'express';
import { validateAlbumCreate, validateAlbumUpdate } from '../validators/albumsValidators.js';
import {protect, admin } from '../middleware/authMiddleware.js';
import { getAllAlbums, filterAlbums, createAlbum, updateAlbum, deleteAlbum, downloadAlbum } from '../controllers/albumController.js';
import { listenToAlbum, toggleLike } from '../controllers/userController.js';

const router = express.Router();

/* ======== All users routes ======== */
router.get('/', getAllAlbums);
router.get("/:filterField/:filterVal", filterAlbums);

/* ======== Registered only users routes ======== */
router.post('/:id/like', protect, toggleLike);
router.post('/:id/listen', protect, listenToAlbum);
router.get("/:id/download", protect, downloadAlbum);

/* ======== Admin routes ======== */
router.post("/", protect, admin, validateAlbumCreate, createAlbum);
router.put("/:id", protect, admin, validateAlbumUpdate, updateAlbum);
router.delete("/:id", protect, admin, deleteAlbum);

export default router;
