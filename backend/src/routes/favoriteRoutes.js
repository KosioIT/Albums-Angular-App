import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { addAlbumToFavorites, getFavoriteAlbums, removeFromFavorites } from '../controllers/userController.js';

const router = express.Router();

// Get user's favorite albums
router.get('/', protect, getFavoriteAlbums);

// Add album to favorites
router.post('/:albumId', protect, addAlbumToFavorites);

// Remove album from favorites
router.delete('/:albumId', protect, removeFromFavorites);

export default router;
