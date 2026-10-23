import { db } from "../config/firebase/firebase.js";
import { Album } from "../models/Album.js";
import { loadOwnedAlbumOrThrow, handleAlbumErrors } from "../utils/albumUtils.js";
import { findAlbums } from "../services/albumService.js";

const ALBUMS = db.collection("albums");

export const getAllAlbums = async (_req, res) => {
  try {
    const snapshot = await ALBUMS.get();

    const albums = snapshot.docs.map((doc) => {
      const album = new Album(doc.data(), doc.id);
      return album;
    });

    return res.json({ success: true, data: albums });
  } catch (err) {
    console.error("Get albums error:", err);
    return res.status(500).json({ success: false, message: "Server error!" });
  }
};

export const filterAlbums = async (req, res) => {
  try {
    const { filterField, filterVal } = getFilterParams(req);

    const result = await findAlbums(filterField, filterVal);

    if (!result || (Array.isArray(result) && result.length === 0)) {
      return res.status(404).json({
        success: false,
        message: "No albums found!"
      });
    }

    return res.json({
      success: true,
      data: result,
      count: Array.isArray(result) ? result.length : 1
    });

  } catch (err) {
    console.error("Filter error:", err);
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

export const createAlbum = async (req, res) => {
  try {
    const album = new Album(req.body);

    const existing = await findAlbums("title", album.title);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Album with this title already exists!"
      });
    }
    // Add creator
    album.createdBy = req.user.id;

    // Save using slug ID
    await ALBUMS.doc(album.id).set(album.toFirestore());

    return res.status(201).json({
      success: true,
      id: album.id
    });

  } catch (err) {
    console.error("Create album error:", err);
    return res.status(400).json({ success: false, message: "Invalid data!" });
  }
};

export const updateAlbum = async (req, res) => {
  try {
    const album = await loadOwnedAlbumOrThrow(req.user, req.params.id);

    album.update(req.body);

    await ALBUMS.doc(album.id).update(album.toFirestore());

    return res.json({
      success: true,
      message: "Album updated successfully!",
      data: album,
    });
  } catch (err) {
    console.error("Update album error:", err);
    return res.status(400).json({ success: false, message: "Invalid data!" });
  }
};

export const deleteAlbum = async (req, res) => {
  try {
    console.debug("[deleteAlbum] User role = ", req.user.role);
    const album = await loadOwnedAlbumOrThrow(req.user, req.params.id);
    await ALBUMS.doc(album.id).delete();

    return res.json({ success: true, message: "Album removed successfully!" });
  } catch (err) {
    console.error("Delete album error:", err);
    return handleAlbumErrors(err, res);
  }
};

// Download album file (zip) from MEGA
export const downloadAlbum = async (req, res) => {
  try {
    const slug = req.params.slug;

    const doc = await ALBUMS.doc(slug).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Album not found!"
      });
    }

    const album = doc.data();

    if (!album.megaUrl) {
      return res.status(404).json({
        success: false,
        message: "Mega download link not available!"
      });
    }

    // Redirect to Mega file
    return res.redirect(album.megaUrl);

  } catch (err) {
    console.error("Download error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error!"
    });
  }
};

// Helper function to get filter parameters
export const getFilterParams = (req) => {
  const { filterField, filterVal } = req.params;

  if (!filterField || !filterVal) {
    throw new Error("Filter field and value are required!");
  }

  return { filterField, filterVal };
};
