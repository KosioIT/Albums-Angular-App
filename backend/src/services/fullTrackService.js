import { createStreamLink, isStorageConfigured } from './storageService.js';
import { fullTrackFor } from '../utils/trackMatch.js';

/*
  Whole songs for logged-in users: adds fullUrl (a link to the song in R2) to the Deezer previews
  whose song was taken out of the album's archive. Guests get the 30-second previews only.

  tracks: previews ({ id, title, ... }), albumOf(track) -> the album with its fullTracks
*/
export async function withFullTracks(tracks, albumOf, user) {
    if (!user || !isStorageConfigured()) return tracks;
    return Promise.all(
        tracks.map(async (track) => {
            const album = albumOf(track);
            const file = album && fullTrackFor(album.fullTracks, track, album.artist);
            if (!file) return track;
            try {
                return { ...track, fullUrl: await createStreamLink(file.key) };
            } catch (err) {
                console.error('Song link error:', err.message);
                return track; // the preview still plays
            }
        }),
    );
}
