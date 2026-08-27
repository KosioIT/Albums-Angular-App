import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { User } from '../models/User.js';
import { Album } from '../models/Album.js';
import { toAlbumDTO } from '../dto/album.dto.js';
import { getAlbumById } from '../controllers/albumController.js';

const router = express.Router();
const USERS = db.collection('users');
const ALBUMS = db.collection('albums');

// Get user's favorite albums
router.get('/', protect, async (req, res) => {
  try {
    const user = req.user; // User Class instance

    if (!user.favorites || user.favorites.length === 0) {
      throw new Error('No favorite albums found for this user!');
    }

    const albumPromises = user.favorites.map(id => ALBUMS.doc(id).get());
    const albumDocs = await Promise.all(albumPromises);

    const albums = albumDocs
      .filter(doc => doc.exists)
      .map(doc => new Album(doc.data(), doc.id));

    res.json({ success: true, data: albums });
  } catch (err) {
    console.error('Favorites GET error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add album to favorites
router.post('/:albumId', protect, async (req, res) => {
  try {
    const user = req.user;
    const albumId = req.params.albumId;

    // Ensure the album exists
    await getAlbumById(albumId);

    if (!user.favorites.includes(albumId)) {
      user.favorites.push(albumId);
      await USERS.doc(user.id).update(user.toFirestore());
    }else{
      return res.status(400).json({ success: false, message: 'Album already in favorites!' });
    }

    res.json({
      success: true,
      message: 'Album added to favorites',
      favorites: user.favorites
    });
  } catch (err) {
    console.error('Favorites ADD error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Remove album from favorites
router.delete('/:albumId', protect, async (req, res) => {
  try {
    const user = req.user;
    const albumId = req.params.albumId;

    //Ensure the album exists before attempting to remove it
    await getAlbumById(albumId);

    user.favorites = user.favorites.filter(id => id.toString() !== albumId);
    await USERS.doc(user.id).update(user.toFirestore());

    const updatedUser = await User.findById(user._id).populate('favorites');
    const favoritesDTO = updatedUser.favorites.map(toAlbumDTO);

    res.json({ success: true, message: 'Album removed from favorites', favorites: favoritesDTO });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
