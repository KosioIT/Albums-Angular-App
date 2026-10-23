import express from 'express';
import { validateAlbumCreate, validateAlbumUpdate } from '../validators/albumsValidators.js';
import {protect, admin } from '../middleware/authMiddleware.js';
import { getAllAlbums, filterAlbums, createAlbum, updateAlbum, deleteAlbum, downloadAlbum } from '../controllers/albumController.js';

const router = express.Router();

/* ======== All users routes ======== */
router.get('/', getAllAlbums);
router.get("/:filterField/:filterVal", filterAlbums);

/* ======== Registered only users routes ======== */
router.get("/:id/download", protect, downloadAlbum);

/* ======== Admin routes ======== */
router.post("/", protect, admin, validateAlbumCreate, createAlbum);
router.put("/:id", protect, admin, validateAlbumUpdate, updateAlbum);
router.delete("/:id", protect, admin, deleteAlbum);

export default router;
