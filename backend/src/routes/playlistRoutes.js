import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import { validatePlaylistCreate, validatePlaylistUpdate, validateTrackAdd, validateTrackOrder } from '../validators/playlistValidators.js';
import * as c from '../controllers/playlistController.js';

const router = express.Router();

// Building a playlist can look up a whole album on Deezer
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  message: { success: false, message: 'Too many changes! Please wait a minute.' },
});

/* Everyone: public playlists (a private one is visible to its owner only) */
router.get('/public', c.listPublic);

/* Signed-in users: their own playlists */
router.get('/mine', protect, c.listMine);
router.post('/', protect, writeLimiter, validatePlaylistCreate, c.create);

router.get('/:id', optionalAuth, c.getOne);
router.get('/:id/previews', optionalAuth, c.getPreviews);

/* Owner only (checked in the service) */
router.patch('/:id', protect, writeLimiter, validatePlaylistUpdate, c.update);
router.delete('/:id', protect, c.remove);
router.post('/:id/tracks', protect, writeLimiter, validateTrackAdd, c.addTrack);
router.delete('/:id/tracks/:trackId', protect, writeLimiter, c.removeTrack);
router.put('/:id/tracks/order', protect, writeLimiter, validateTrackOrder, c.reorder);

export default router;
