import express from 'express';
import { getUser, getAllUsers, getMyActivity, revokeUserSessions } from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/me/activity', protect, getMyActivity);
router.get('/', protect, admin, getAllUsers);
router.get('/:field/:value', protect, admin, getUser);
router.post('/:email/sessions/revoke', protect, admin, revokeUserSessions);
// Ban, unban, admin rights and deleting: through a vote (/api/votes)

export default router;