import { matchedData } from 'express-validator';
import * as playlists from '../services/playlistService.js';

// Runs a service call and answers with its result (or the PlaylistError's status)
const handle = (fn, status = 200) => async (req, res) => {
  try {
    const data = await fn(req);
    return res.status(status).json({ success: true, data });
  } catch (err) {
    if (err instanceof playlists.PlaylistError) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    console.error('Playlist error:', err);
    return res.status(500).json({ success: false, message: 'Something went wrong with the playlist!' });
  }
};

export const listMine = handle((req) => playlists.listMine(req.user));
export const listPublic = handle(() => playlists.listPublic());
export const getOne = handle((req) => playlists.getPlaylist(req.params.id, req.user));
export const getPreviews = handle((req) => playlists.getPlaylistPreviews(req.params.id, req.user));
export const create = handle((req) => playlists.createPlaylist(req.user, matchedData(req)), 201);
export const update = handle((req) => playlists.updatePlaylist(req.params.id, req.user, matchedData(req)));
export const remove = handle(async (req) => {
  await playlists.deletePlaylist(req.params.id, req.user);
  return null;
});
export const addTrack = handle((req) => {
  const { albumId, trackId } = matchedData(req);
  return playlists.addTrack(req.params.id, req.user, albumId, trackId);
}, 201);
export const removeTrack = handle((req) => playlists.removeTrack(req.params.id, req.user, req.params.trackId));
export const reorder = handle((req) => playlists.reorderTracks(req.params.id, req.user, matchedData(req).order));
