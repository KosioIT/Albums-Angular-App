import { db } from "../config/firebase.js";
import { Album } from "../models/Album.js";
import { getAlbumBy, getFilteredAlbums } from "../utils/albumUtils.js";

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

export const getAlbumById = async (req, res) => {
  try {
    const album = await getAlbumBy("id", req.params.id);
    if (!album)
      return res
        .status(404)
        .json({ success: false, message: "Album not found" });

    return res.json({ success: true, data: album });
  } catch (err) {
    console.error("Get album error:", err);
    return res.status(500).json({ success: false, message: "Server error!" });
  }
};

// Get (filter) albums by certain criteria
export const filterAlbumsByValue = async (req, res) => {
  try {
    const filterField = req.params.filterField; // title, artist, genre, year, duration...
    const filterVal = req.params.filterVal;

    if (!filterField || !filterVal) {
      return res.status(400).json({});
    }

    const albums = await getFilteredAlbums(filterField, filterVal);

    if (albums.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No albums found!",
      });
    }

    return res.json({
      success: true,
      count: albums.length,
      data: albums,
    });
  } catch (err) {
    console.error("Filter albums error:", err);
    return res.status(500).json({ success: false, message: "Server error!" });
  }
};

export const createAlbum = async (req, res) => {
  try {
    const { title, artist, genre, release_date, rank, producers, tracks } =
      req.body;

    // req.user comes from protect middleware → User Class
    const createdBy = req.user.id;

    const album = new Album({
      title,
      artist,
      genre,
      release_date,
      rank,
      producers,
      tracks,
      createdBy,
    });

    const docRef = await ALBUMS.add(album.toFirestore());

    return res.status(201).json({ success: true, id: docRef.id });
  } catch (err) {
    console.error("Create album error:", err);
    return res.status(400).json({ success: false, message: "Invalid data!" });
  }
};

export const updateAlbum = async (req, res) => {
  try {
    const doc = await ALBUMS.doc(req.params.id).get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Album not found!" });
    }

    const album = new Album(doc.data(), doc.id);

    // Check ownership
    if (!album.createdBy || album.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized!" });
    }

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
    const doc = await ALBUMS.doc(req.params.id).get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Album not found!" });
    }

    const album = new Album(doc.data(), doc.id);

    // Check ownership
    if (!album.createdBy || album.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized!" });
    }

    await ALBUMS.doc(album.id).delete();

    return res.json({ success: true, message: "Album removed successfully!" });
  } catch (err) {
    console.error("Delete album error:", err);
    return res.status(500).json({ success: false, message: "Server error!" });
  }
};
