import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import * as c from '../controllers/voteController.js';

// Admins only: decisions about users are voted on (see voteService)
const router = express.Router();
router.use(protect, admin);

router.get('/', c.list);
router.get('/waiting', c.waiting);
router.post('/', c.propose);
router.post('/:id/vote', c.vote);
router.post('/:id/cancel', c.cancel);

export default router;
