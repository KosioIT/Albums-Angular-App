import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import { Album } from '../models/Album.js';
import { toAlbumDTO } from '../dto/album.dto.js';

const router = express.Router();

// Get user's favorite albums
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');
    const favoritesDTO = user.favorites.map(toAlbumDTO);
    res.json(favoritesDTO);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add album to favorites
router.post('/:albumId', protect, async (req, res) => {
  try {
    const user = req.user;
    const albumId = req.params.albumId;

    const album = await Album.findById(albumId);
    if (!album) return res.status(404).json({ message: 'Album not found' });

    const alreadyFavorite = user.favorites.some(id => id.toString() === albumId);

    if (!alreadyFavorite) {
      user.favorites.push(albumId);
      await user.save();
    }

    const updatedUser = await User.findById(user._id).populate('favorites');
    const favoritesDTO = updatedUser.favorites.map(toAlbumDTO);

    res.json({ message: 'Album added to favorites', favorites: favoritesDTO });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove album from favorites
router.delete('/:albumId', protect, async (req, res) => {
  try {
    const user = req.user;
    const albumId = req.params.albumId;

    const album = await Album.findById(albumId);
    if (!album) return res.status(404).json({ message: 'Album not found' });

    user.favorites = user.favorites.filter(id => id.toString() !== albumId);
    await user.save();

    const updatedUser = await User.findById(user._id).populate('favorites');
    const favoritesDTO = updatedUser.favorites.map(toAlbumDTO);

    res.json({ message: 'Album removed from favorites', favorites: favoritesDTO });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
