import express from 'express';
import { validateAlbumCreate, validateAlbumUpdate } from '../validators/albumsValidators.js';
import {protect, admin } from '../middleware/authMiddleware.js';
import { getAllAlbums, filterAlbums, createAlbum, updateAlbum, deleteAlbum, downloadAlbum } from '../controllers/albumController.js';
import { listenToAlbum, toggleLike } from '../controllers/userController.js';

const router = express.Router();

/* ======== Registered only users routes ======== */
// Before "/:filterField/:filterVal", which would otherwise also match "/<id>/download"
router.get("/:id/download", protect, downloadAlbum);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/listen', protect, listenToAlbum);

/* ======== All users routes ======== */
router.get('/', getAllAlbums);
router.get("/:filterField/:filterVal", filterAlbums);

/* ======== Admin routes ======== */
router.post("/", protect, admin, validateAlbumCreate, createAlbum);
router.put("/:id", protect, admin, validateAlbumUpdate, updateAlbum);
router.delete("/:id", protect, admin, deleteAlbum);

export default router;
