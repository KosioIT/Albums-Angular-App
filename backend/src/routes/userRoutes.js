import express from 'express';
import { getUser, deleteUser, getAllUsers, getMyActivity, changeUserRole, revokeUserSessions } from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/me/activity', protect, getMyActivity);
router.get('/', protect, admin, getAllUsers);
router.get('/:field/:value', protect, admin, getUser);
router.delete('/', protect, admin, deleteUser);
router.patch('/:email/role', protect, admin, changeUserRole);
router.post('/:email/sessions/revoke', protect, admin, revokeUserSessions);

export default router;