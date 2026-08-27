import express from 'express';
import { getUserById, updateUser, deleteUser } from '../controllers/userController.js';
import { validateUpdateUser } from '../validators/userValidator.js';

const router = express.Router();

//Get user by ID
router.get('/:id', getUserById);

//Update user
router.put('/:id', validateUpdateUser, updateUser);

//Delete user
router.delete('/:id', deleteUser);

export default router;