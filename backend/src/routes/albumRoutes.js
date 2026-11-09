import express from 'express';
import rateLimit from 'express-rate-limit';
import { validateAlbumCreate, validateAlbumUpdate } from '../validators/albumsValidators.js';
import {protect, admin } from '../middleware/authMiddleware.js';
import { getAllAlbums, filterAlbums, createAlbum, updateAlbum, deleteAlbum, downloadAlbum, getPreviews } from '../controllers/albumController.js';
import { listenToAlbum, toggleLike } from '../controllers/userController.js';

const router = express.Router();

// Every uncached request goes to Deezer, which allows about 50 requests per 5 seconds in total
const previewsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  message: { success: false, message: 'Too many requests! Please wait a minute.' },
});

/* ======== Registered only users routes ======== */
router.post("/:id/download", protect, downloadAlbum);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/listen', protect, listenToAlbum);

/* ======== All users routes ======== */
router.get('/', getAllAlbums);
router.get('/:id/previews', previewsLimiter, getPreviews); // before /:filterField/:filterVal
router.get("/:filterField/:filterVal", filterAlbums);

/* ======== Admin routes ======== */
router.post("/", protect, admin, validateAlbumCreate, createAlbum);
router.put("/:id", protect, admin, validateAlbumUpdate, updateAlbum);
router.delete("/:id", protect, admin, deleteAlbum);

export default router;
