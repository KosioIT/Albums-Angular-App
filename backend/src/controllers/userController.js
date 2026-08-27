import bcrypt from "bcrypt";
import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import {
  validateUserCreate,
  validateUserUpdate,
} from "../validators/userValidator.js";
import User from "../models/User.js";
import { Album } from "../models/Album.js";
import { validateFavoriteOperation } from "../utils/favoritesUtils.js";
import { getUserBy } from "../utils/userUtils.js";
import { getAlbumBy } from "../utils/albumUtils.js";
import { sendWelcomeEmail } from "../../utils/email/sendWelcomeEmail.js";

const USERS = db.collection("users");
const ALBUMS = db.collection("albums");

/* ----- USER CRUD FUNCTIONS ----- */

// Unified GET query
export async function getUser(req, res) {
  try {
    const { field, value } = req.params;

    if (!field || !value) {
      return res.status(400).json({
        success: false,
        message: "Invalid query params!"
      });
    }

    // Unified lookup
    const user = await getUserBy(field, value);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!"
      });
    }

    return res.json({
      success: true,
      data: user
    });

  } catch (err) {
    console.error("Get user error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not fetch user!"
    });
  }
}

//Same as CREATE operation (POST method)
export async function registerUser(req, res) {
  const error = validateUserCreate(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const { username, email, password } = req.body;

    // Check if email already exists
    const existingUser = await getUserBy("email", email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists!",
      });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    const docRef = await USERS.add(user.toFirestore());

    // Send welcome email
    await sendWelcomeEmail(email, username);

    return res.json({
      success: true,
      id: docRef.id,
      message: `User ${username} created successfully!`,
    });

  } catch (err) {
    console.error("Register error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not register user!" });
  }
}

export async function updateUser(req, res) {
  const error = validateUserUpdate(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    const docRef = USERS.doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "User not found!" });
    }

    const user = new User(doc.data());
    user.update(req.body);

    await docRef.update(user.toFirestore());

    // Hash password if updated
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    await docRef.update(updateData);

    return res.json({ success: true, message: "User updated successfully!" });

  } catch (err) {
    console.error("Update user error:", err);
    return res.status(500).json({ success: false, message: "Could not update user!" });
  }
}

export async function deleteUser(req, res) {
  try {
    const docRef = USERS.doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "User not found!" });
    }

    await docRef.delete();

    res.json({ success: true, message: "User deleted successfully!" });

  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ success: false, message: "Could not delete user!" });
  }
}

/* ----- ALBUMS-RELATED OPERATIONS ----- */

export async function getFavoriteAlbums(req, res) {
  try {
    const user = req.user;

    if (!user.favorites || user.favorites.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Load albums from Firestore
    const albumPromises = user.favorites.map((id) => ALBUMS.doc(id).get());
    const albumDocs = await Promise.all(albumPromises);

    const albums = albumDocs
      .filter((doc) => doc.exists)
      .map((doc) => new Album(doc.data(), doc.id));

    return res.json({ success: true, data: albums });

  } catch (err) {
    console.error("Get favorite albums error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not fetch favorite albums!" });
  }
}

export async function addAlbumToFavorites(req, res) {
  try {
    const user = req.user;
    const albumId = req.params.albumId;

    // Validate the favorite operation (add)
    const validation = await validateFavoriteOperation(user, albumId, "add");
    if (!validation.ok) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      });
    }

    user.addFavorite(albumId);
    await USERS.doc(user.id).update({ favorites: user.favorites });

    return res.json({
      success: true,
      message: "Album added to favorites!",
      favorites: user.favorites,
    });

  } catch (err) {
    console.error("Add favorite album error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not add favorite album!" });
  }
}

export async function removeFromFavorites(req, res) {
  try {
    const user = req.user;
    const albumId = req.params.albumId;

    // Validate the favorite operation (remove)
    const validation = await validateFavoriteOperation(user, albumId, "remove");
    if (!validation.ok) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      });
    }

    user.removeFavorite(albumId);
    await USERS.doc(user.id).update({ favorites: user.favorites });

    return res.json({ success: true, message: "Album removed from favorites!" });

  } catch (err) {
    console.error("Remove favorite album error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not remove favorite album!" });
  }
}

// Add/remove like
export async function toggleLike(req, res) {
  try {
    const user = req.user;
    const albumId = req.params.albumId;

    const album = await getAlbumBy("id", albumId);
    if (!album) {
      return res.status(404).json({
        success: false,
        message: "Album not found!",
      });
    }

    // Initialize the array if missing
    user.likedAlbums = user.likedAlbums || [];

    const alreadyLiked = user.likedAlbums.includes(albumId);

    if (!alreadyLiked) {
      // -------------------------
      // LIKE logic
      // -------------------------

      // Add to user instance
      user.likedAlbums.push(albumId);

      // Save to firestore
      await USERS.doc(user.id).update({
        likedAlbums: user.likedAlbums,
      });

      // Automatic increment
      await ALBUMS.doc(albumId).update({
        likes: FieldValue.increment(1),
      });

      return res.json({
        success: true,
        action: "liked",
        message: "Album liked!",
        likes: album.likes + 1,
      });

    } else {
      // -------------------------
      // UNLIKE logic
      // -------------------------

      // Remove from user model (instance)
      user.likedAlbums = user.likedAlbums.filter((id) => id !== albumId);

      // Save to firestore
      await USERS.doc(user.id).update({
        likedAlbums: user.likedAlbums,
      });

      // Automatic derement
      await ALBUMS.doc(albumId).update({
        likes: FieldValue.increment(-1),
      });

      return res.json({
        success: true,
        action: "unliked",
        message: "Album unliked!",
        likes: album.likes - 1,
      });
    }
  } catch (err) {
    console.error("Toggle like error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not toggle like!",
    });
  }
}
