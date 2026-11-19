import * as songs from '../services/songService.js';
import { isStorageConfigured } from '../services/storageService.js';

// Admin "Songs" page of an album (see songService). Answers { success, data } or { success: false, message }.
const handle = (work) => async (req, res) => {
    if (!isStorageConfigured()) {
        return res.status(503).json({ success: false, message: 'File storage (R2) is not set up on the server.' });
    }
    try {
        return res.json({ success: true, data: await work(req) });
    } catch (err) {
        if (err instanceof songs.SongError) return res.status(err.status).json({ success: false, message: err.message });
        console.error('Songs error:', err);
        return res.status(500).json({ success: false, message: 'Server error!' });
    }
};

// GET /api/albums/:id/songs
export const getSongs = handle((req) => songs.getSongs(req.params.id));
// POST /api/albums/:id/songs/match { names }
export const matchFiles = handle((req) => songs.matchFiles(req.params.id, req.body?.names));
// POST /api/albums/:id/songs/uploads { files: [{ name, size, target }] }
export const createUploads = handle((req) => songs.createUploads(req.params.id, req.body?.files));
// POST /api/albums/:id/songs/complete { files: [{ key, target }] }
export const completeUploads = handle((req) => songs.completeUploads(req.params.id, req.body?.files));
// DELETE /api/albums/:id/songs/:target (a track id or "cover")
export const removeSong = handle((req) => songs.removeSong(req.params.id, req.params.target));
