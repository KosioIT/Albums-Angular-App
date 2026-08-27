import express from 'express';
import { getUser, updateUser, deleteUser } from '../controllers/userController.js';
import { validateUpdateUser } from '../validators/authValidators.js';

const router = express.Router();

//Get user by value (id/username/email)
router.get("/user/:field/:value", getUser);

//Update user
router.put('/:id', validateUpdateUser, updateUser);

//Delete user
router.delete('/:id', deleteUser);

export default router;