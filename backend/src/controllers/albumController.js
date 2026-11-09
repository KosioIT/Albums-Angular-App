import { db } from "../config/firebase/firebase.js";
import { Album } from "../models/Album.js";
import { matchedData } from "express-validator";
import { loadOwnedAlbumOrThrow, getAllAlbumsFromFirestore, findAlbums } from "../services/albumService.js";;
import { recordDownload } from '../services/activityService.js';

const ALBUMS = db.collection("albums");

export const getAllAlbums = async (_req, res) => {
  try {
    const albums = await getAllAlbumsFromFirestore();

    if (!albums || albums.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No albums found!"
      });
    }

    return res.json({ success: true, data: albums });

  } catch (err) {
    console.error("Get albums error:", err);
    return res.status(500).json({ success: false, message: "Server error!" });
  }
};

export const filterAlbums = async (req, res) => {
  try {
    const { filterField, filterVal } = req.params;
    if (!filterField || !filterVal) {
      return res.status(400).json({ success: false, message: "Filter field and value are required!" });
    }

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
    return res.status(500).json({ success: false, message: "Could not filter albums!" });
  }
};

export const createAlbum = async (req, res) => {
  try {
    const album = new Album(matchedData(req));

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
