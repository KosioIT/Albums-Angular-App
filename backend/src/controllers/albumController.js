import { db } from "../config/firebase/firebase.js";
import { Album } from "../models/Album.js";
import { matchedData } from "express-validator";
import { loadOwnedAlbumOrThrow, getAllAlbumsFromFirestore, findAlbums, findAlbumById, SEARCHABLE_FIELDS } from "../services/albumService.js";
import { recordDownload } from '../services/activityService.js';

const ALBUMS = db.collection("albums");

export const getAllAlbums = async (_req, res) => {
  try {
    // An empty list is a normal answer, not an error
    const albums = await getAllAlbumsFromFirestore();
    return res.json({ success: true, data: albums });

  } catch (err) {
    console.error("Get albums error:", err);
    return res.status(500).json({ success: false, message: "Server error!" });
  }
};

// GET /api/albums/id/:id -> one album; GET /api/albums/(band|artist|title|genre|rank)/:value -> a list
export const filterAlbums = async (req, res) => {
  try {
    const { filterField, filterVal } = req.params;

    if (filterField === "id") {
      const album = await findAlbumById(filterVal);
      if (!album) return res.status(404).json({ success: false, message: "Album not found!" });
      return res.json({ success: true, data: album });
    }

    const field = SEARCHABLE_FIELDS[filterField];
    if (!field) {
      return res.status(400).json({
        success: false,
        message: `Albums can be filtered by: id, ${Object.keys(SEARCHABLE_FIELDS).join(", ")}`,
      });
    }

    const albums = await findAlbums(field, filterVal);
    return res.json({ success: true, data: albums, count: albums.length });

  } catch (err) {
    console.error("Filter error:", err);
    return res.status(500).json({ success: false, message: "Could not filter albums!" });
  }
};

export const createAlbum = async (req, res) => {
  try {
    const album = new Album(matchedData(req));

    // The id is the slug of the title, so this also catches titles that differ only in punctuation
    const existing = await findAlbumById(album.id);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Album with this title already exists!"
      });
    }

    // Add creator
    album.createdBy = req.user.id;

    // Save using slug ID; create() fails instead of overwriting if someone saved the same id meanwhile
    await ALBUMS.doc(album.id).create(album.toFirestore());

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
    const changes = matchedData(req);
    const album = new Album(await loadOwnedAlbumOrThrow(req.user, req.params.id), req.params.id);

    album.update(changes);
    album.setUpdateDate();

    const { id, likes, listens, downloads, ...data } = album.toFirestore();
    await ALBUMS.doc(album.id).update(data);

    return res.json({
      success: true,
      message: "Album updated successfully!",
      data: album.toPublic(),
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
    return res.status(400).json({ success: false, message: "Invalid data!" });
  }
};

// Download album file (zip) from MEGA
export const downloadAlbum = async (req, res) => {
  try {
    const slug = req.params.id;

    const doc = await ALBUMS.doc(slug).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Album not found!"
      });
    }

    const album = doc.data();

    if (!album.downloadUrl) {
      return res.status(404).json({
        success: false,
        message: "Mega download link not available!"
      });
    }

    // Redirect to Mega file
    await recordDownload(req.user.id, slug);
    return res.redirect(album.downloadUrl);

  } catch (err) {
    console.error("Download error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error!"
    });
  }
};
