import express from 'express';
import { getUser, deleteUser, getAllUsers } from '../controllers/userController.js';

const router = express.Router();

//Get all users
router.get("/", getAllUsers);

//Get user by value (username/email)
router.get("/:field/:value", getUser);

//Delete user (by email)
router.delete("/", deleteUser);

export default router;