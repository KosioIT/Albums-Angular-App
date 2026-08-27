import bcrypt from 'bcrypt';
import { db } from '../config/firebase.js';
import {checkExistingEmail, getUserFromSnapshot} from './userController.js';
import { validateUserCreate, validateUserUpdate } from '../validators/userValidator.js';
import User from '../models/User.js';

const USERS = db.collection('users');


/* ----- USER CRUD FUNCTIONS ----- */

//Get user by ID
export async function getUserById(req, res) {
    try {
        const doc = await USERS.doc(req.params.id).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'User not found!' });
        }

        res.json({ success: true, data: { id: doc.id, ...doc.data() } });
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ success: false, message: 'Could not fetch user!' });
    }
}

//Get user by email
export async function getUserByEmail(email) {
    try {
        return await getUserFromSnapshot("email", email);
    } catch (err) {
        console.error('Get user by email error:', err);
        throw new Error(err.message);
    }
}

//Get user by username
export async function getUserByUsername(username) {
    try {
        return await getUserFromSnapshot("username", username);
    }
    catch (err) {
        console.error('Get user by username error:', err);
        throw new Error(err.message);
    }
}

//Create user (register)
export async function createUser(req, res) {
  const error = validateUserCreate(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const { username, email, password } = req.body;

    // Check if email already exists
    const emailCheck = await checkExistingEmail(email);
    if (emailCheck.exists) {
      return res.status(400).json({ success: false, message: 'Email already exists!' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    const docRef = await USERS.add(user.toFirestore());

    res.json({ success: true, id: docRef.id, message: `User ${username} created successfully!` });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Could not register user!' });
  }
}

//Update user
export async function updateUser(req, res) {
    const error = validateUserUpdate(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    try {
        const docRef = USERS.doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'User not found!' });
        }

        const user = new User(doc.data());
        user.update(req.body);

        await docRef.update(user.toFirestore());

        // Hash password if updated
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        await docRef.update(updateData);

        res.json({ success: true, message: 'User updated successfully!' });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ success: false, message: 'Could not update user!' });
    }
}

//Delete user
export async function deleteUser(req, res) {
    try {
        const docRef = USERS.doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'User not found!' });
        }

        await docRef.delete();

        res.json({ success: true, message: 'User deleted successfully!' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ success: false, message: 'Could not delete user!' });
    }
}