import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { getSiteStats } from '../services/statsService.js';

const router = express.Router();

// GET /api/stats -> site-wide statistics (admins only)
router.get('/', protect, admin, async (_req, res) => {
  try {
    return res.json({ success: true, data: await getSiteStats() });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ success: false, message: 'Could not load the statistics!' });
  }
});

export default router;
