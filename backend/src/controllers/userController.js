import bcrypt from "bcrypt";
import { db } from "../config/firebase/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import {
  validateUserCreate
} from "../validators/userValidators.js";
import { User } from "../models/User.js";
import { Album } from "../models/Album.js";
import { validateFavoriteOperation } from "../utils/favoritesUtils.js";
import { getUserBy, checkExistingCredential } from "../services/userService.js";
import { findAlbums } from "../services/albumService.js";
import { sendWelcomeEmail } from '../utils/email/sendWelcomeEmail.js';

const USERS = db.collection("users");
const ALBUMS = db.collection("albums");

/* ----- USER CRUD FUNCTIONS ----- */

export async function getAllUsers(req, res) {
  try {
    const usersSnapshot = await USERS.get();
    const users = usersSnapshot.docs.map((doc => doc.data()));
    return res.status(200).json({ success: true, data: users, message: "Users fetched successfully!" });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch users!" });
  }
}

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
  try {
    const error = validateUserCreate(req.body);
    if (error) return res.status(400).json({ success: false, message: error });

    const { username, email, password, role } = req.body;

    if (await checkExistingCredential("username", username))
      return res.status(409).json({ message: "Username already exists!" });

    if (await checkExistingCredential("email", email))
      return res.status(409).json({ message: "Email already exists!" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: role ? role : "user" // Default role is "user"
    });

    await USERS.doc(email).set(user.toFirestore());

    res.json({
      success: true,
      email: email,
      message: `User ${username} created successfully!`,
    });

    sendWelcomeEmail(email, username).catch(err => {
      console.error("Error sending welcome email:", err);
    });

  } catch (err) {
    console.error("Register error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not register user!" });
  }
}

//Delete user by email
export async function deleteUser(req, res) {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email query parameter is required!"
      });
    }

    await db.collection("users").doc(email).delete();

    return res.json({
      success: true,
      message: `User ${email} deleted successfully!`
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
}


/* ----- ALBUMS-RELATED OPERATIONS ----- */

export async function getFavoriteAlbums(req, res) {
  try {
    const user = req.user;

    if (!user.favorites || user.favorites.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Load albums from Firestore (favorites store album slug ids)
    const snapshots = await Promise.all(
      user.favorites.map((slug) => ALBUMS.doc(slug).get())
    );

    const albums = snapshots
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
    const slug = req.params.id;

    // Validate the favorite operation (add)
    const validation = await validateFavoriteOperation(user, slug, "add");
    if (!validation.ok) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      });
    }

    user.addFavorite(slug);
    await USERS.doc(user.email).update({ favorites: user.favorites });

    return res.json({
      success: true,
      message: "Album added to favorites!",
      data: user.favorites,
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
    const slug = req.params.id;

    // Validate the favorite operation (remove)
    const validation = await validateFavoriteOperation(user, slug, "remove");
    if (!validation.ok) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      });
    }

    user.removeFavorite(slug);
    await USERS.doc(user.email).update({ favorites: user.favorites });

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

    const album = await findAlbums("id", albumId);
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

