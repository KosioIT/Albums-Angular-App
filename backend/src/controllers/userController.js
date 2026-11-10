import bcrypt from "bcrypt";
import { db } from "../config/firebase/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import { User } from "../models/User.js";
import { Album } from "../models/Album.js";
import { validateFavoriteOperation } from "../utils/favoritesUtils.js";
import { getUserBy, checkExistingCredential } from "../services/userService.js";
import { recordListen, recordGuestListen, getActivitySummary } from '../services/activityService.js';
import { checkExistingAlbum } from "../services/albumService.js";
import { sendWelcomeEmail } from '../utils/email/sendWelcomeEmail.js';
import { revokeAllSessions, createSession } from '../services/sessionService.js';
import { generateAccessToken } from '../services/authService.js';
import { setRefreshCookie } from '../utils/refreshCookie.js';

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

// Same as CREATE operation (POST method); the new user is logged in right away
export async function registerUser(req, res) {
  try {
    const { username, email, password } = req.body;

    if (await checkExistingCredential("username", username))
      return res.status(409).json({ success: false, field: "username", message: "Username already exists!" });

    if (await checkExistingCredential("email", email))
      return res.status(409).json({ success: false, field: "email", message: "Email already exists!" });

    const user = new User({
      username,
      email,
      password: await bcrypt.hash(password, 10),
      role: "user" // Default role is "user" (admin role can be assigned manually in the database)
    }, email);

    try {
      await USERS.doc(email).create(user.toFirestore());
    } catch (err) {
      if (err.code === 6) { // ALREADY_EXISTS: the email was registered a moment ago
        return res.status(409).json({ success: false, field: "email", message: "Email already exists!" });
      }
      throw err;
    }

    const { sessionId, refreshToken } = await createSession(user.id, req.get("user-agent"));
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      message: `Welcome, ${username}! Your account has been created.`,
      token: generateAccessToken(user, sessionId),
      user: user.toBasic(),
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
    const email = String(req.query.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: "Email query parameter is required!" });
    }
    if (email === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account!" });
    }

    const ref = USERS.doc(email);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    await revokeAllSessions(email); // first, so the user cannot act while the data is removed

    // Take this user's likes out of the album counters (skip albums that no longer exist)
    const liked = snap.data().likedAlbums || [];
    if (liked.length) {
      const albums = await db.getAll(...liked.map((id) => ALBUMS.doc(id)));
      const batch = db.batch();
      albums
        .filter((a) => a.exists)
        .forEach((a) => batch.update(a.ref, { likes: FieldValue.increment(-1) }));
      await batch.commit(); // one batch holds up to 500 writes, plenty for now
    }

    await db.recursiveDelete(ref); // the user and the "activity" subcollection

    return res.json({ success: true, message: `User ${email} deleted successfully!` });
  } catch (err) {
    console.error("Delete user error:", err);
    return res.status(500).json({ success: false, message: "Could not delete user!" });
  }
}


/* ----- ALBUMS-RELATED OPERATIONS ----- */

// POST /api/albums/:id/listen -> { counted, guest }
// Signed-in users get it in their activity; guests (header X-Guest-Id: a random id kept in the
// browser) only add to album.guestListens. counted = false for a repeat within a minute.
export async function listenToAlbum(req, res) {
  try {
    const albumId = req.params.id;
    if (!(await checkExistingAlbum(albumId))) {
      return res.status(404).json({ success: false, message: 'Album not found!' });
    }

    if (req.user) {
      const counted = await recordListen(req.user.id, albumId);
      return res.json({ success: true, counted, guest: false });
    }

    const guestId = /^[\w-]{8,64}$/.test(req.get('X-Guest-Id') || '') ? req.get('X-Guest-Id') : null;
    const counted = await recordGuestListen(albumId, guestId, req.ip);
    return res.json({ success: true, counted, guest: true });
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
      .map((doc) => new Album(doc.data(), doc.id).toPublic());

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
    await USERS.doc(user.id).update({ favorites: FieldValue.arrayUnion(slug) });

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
    await USERS.doc(user.id).update({ favorites: FieldValue.arrayRemove(slug) });

    return res.json({ success: true, message: "Album removed from favorites!" });

  } catch (err) {
    console.error("Remove favorite album error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not remove favorite album!" });
  }
}

// Add/remove like
// POST /api/albums/:id/like -> { liked, likes }; liking again removes the like
export async function toggleLike(req, res) {
  try {
    const user = req.user;
    const albumId = req.params.id;
    if (!(await checkExistingAlbum(albumId))) {
      return res.status(404).json({ success: false, message: "Album not found!" });
    }

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
      liked: result.liked,
      message: result.liked ? "Album liked!" : "Album unliked!",
      likes: result.likes,
    });
  } catch (err) {
    console.error("Toggle like error:", err);
    return res.status(500).json({ success: false, message: "Could not toggle like!" });
  }
}
