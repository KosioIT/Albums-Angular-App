import express from 'express';
import { getUser, deleteUser, getAllUsers, getMyActivity } from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/me/activity', protect, getMyActivity);
router.get('/', protect, admin, getAllUsers);
router.get('/:field/:value', protect, admin, getUser);
router.delete('/', protect, admin, deleteUser);

export default router;