import bcrypt from "bcrypt";
import { db } from "../config/firebase/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { User } from "../models/User.js";
import { Album } from "../models/Album.js";
import { validateFavoriteOperation } from "../utils/favoritesUtils.js";
import { getUserBy, checkExistingCredential } from "../services/userService.js";
import { recordListen, getActivitySummary, setLiked } from '../services/activityService.js';
import { checkExistingAlbum } from "../services/albumService.js";
import { sendWelcomeEmail } from '../utils/email/sendWelcomeEmail.js';
import { revokeAllSessions } from '../services/sessionService.js';

const USERS = db.collection("users");
const ALBUMS = db.collection("albums");


/* ----- USER CRUD FUNCTIONS ----- */

export async function getAllUsers(req, res) {
  try {
    const usersSnapshot = await USERS.get();
    const users = usersSnapshot.docs.map(doc => new User(doc.data(), doc.id).toPublic());
    return res.status(200).json({ success: true, data: users, message: "Users fetched successfully!" });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch users!" });
  }
}

// Unified GET query
export async function getUser(req, res) {
  try {
    const ALLOWED_FIELDS = ["email", "username"];
    const { field, value } = req.params;

    if (!ALLOWED_FIELDS.includes(field) || !value) {
      return res.status(400).json({ success: false, message: "Invalid query params!" });
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
      data: user.toPublic()
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
    const { username, email, password } = req.body;

    if (await checkExistingCredential("username", username))
      return res.status(409).json({ message: "Username already exists!" });

    if (await checkExistingCredential("email", email))
      return res.status(409).json({ message: "Email already exists!" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: "user" // Default role is "user" (admin role can be assigned manually in the database)
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
    await revokeAllSessions(email);

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

export async function listenToAlbum(req, res) {
  try {
    const { albumId } = req.params;
    if (!(await checkExistingAlbum(albumId))) {
      return res.status(404).json({ success: false, message: 'Album not found!' });
    }
    await recordListen(req.user.id, albumId);
    return res.json({ success: true });
  } catch (err) {
    console.error('Listen error:', err);
    return res.status(500).json({ success: false, message: 'Could not record listen!' });
  }
}

//Get activity summary (listens, downloads, likes)
export async function getMyActivity(req, res) {
  try {
    const data = await getActivitySummary(req.user.id);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Activity error:', err);
    return res.status(500).json({ success: false, message: 'Could not fetch activity!' });
  }
}

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

    const albumRef = ALBUMS.doc(albumId);
    const userRef = USERS.doc(user.id);
    const activityRef = userRef.collection("activity").doc(albumId);

    const result = await db.runTransaction(async (t) => {
      // all reads first
      const albumSnap = await t.get(albumRef);
      if (!albumSnap.exists) return null;
      const userSnap = await t.get(userRef);

      const alreadyLiked = (userSnap.data().likedAlbums || []).includes(albumId);
      const delta = alreadyLiked ? -1 : 1;

      // then all writes
      t.update(userRef, {
        likedAlbums: alreadyLiked
          ? FieldValue.arrayRemove(albumId)
          : FieldValue.arrayUnion(albumId),
      });
      t.update(albumRef, { likes: FieldValue.increment(delta) });
      t.set(activityRef, {
        liked: !alreadyLiked,
        likedAt: alreadyLiked ? null : new Date().toISOString(),
      }, { merge: true });

      return { liked: !alreadyLiked, likes: (albumSnap.data().likes || 0) + delta };
    });

    if (!result) {
      return res.status(404).json({ success: false, message: "Album not found!" });
    }

    return res.json({
      success: true,
      action: result.liked ? "liked" : "unliked",
      message: result.liked ? "Album liked!" : "Album unliked!",
      likes: result.likes,
    });
  } catch (err) {
    console.error("Toggle like error:", err);
    return res.status(500).json({ success: false, message: "Could not toggle like!" });
  }
}
