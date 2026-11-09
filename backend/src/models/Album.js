import { BaseModel } from './BaseModel.js';
import { makeSlug } from '../utils/slugify.js';

export class Album extends BaseModel {
  constructor(data, id = null) {
    const finalId = id || makeSlug(data.title);
    super(data, finalId);

    this.id = finalId;

    // Basic fields
    this.title = data.title;
    this.artist = data.artist;
    this.genre = data.genre;
    this.release_date = data.release_date;
    this.cover_img_url = data.cover_img_url || null;
    this.length = data.length || null; // total running time, "m:ss" or "h:mm:ss"

    // Optional fields
    this.rank = data.rank || 'common';
    this.likes = data.likes || 0;
    this.moods = data.moods || [];
    this.producers = data.producers || [];

    // Counters (changed only with FieldValue.increment in Firestore)
    this.likes = data.likes || 0;
    this.listens = data.listens || 0;
    this.downloads = data.downloads || 0;

    // Tracks
    this.tracks = data.tracks || [];

    // Timestamps
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || null;

    // User (id) who created the album
    this.createdBy = data.createdBy || null;

    // Deezer album used for the 30-second previews (found automatically, can be set by hand)
    this.deezerAlbumId = data.deezerAlbumId || null;

    // Download URL (any provider; never sent to clients, see toPublic)
    this.downloadUrl = data.downloadUrl || null;
  }

  // Public representation: hides the download link
  toPublic() {
    const { downloadUrl, ...safe } = this;
    return { ...safe, hasDownload: !!downloadUrl };
  }

  /**
   * Add a track
   */
  addTrack(track) {
    this.tracks.push(track);
    this.setUpdateDate();
  }

  /**
   * Remove a track by index
   */
  removeTrack(index) {
    if (index >= 0 && index < this.tracks.length) {
      this.tracks.splice(index, 1);
      this.setUpdateDate();
    }
  }

  like() {
    this.likes += 1;
    this.setUpdateDate();
  }

  unike() {
    if (this.likes > 0) {
      this.likes -= 1;
      this.setUpdateDate();
    }
  }

  setUpdateDate() {
    this.updated_at = new Date().toISOString();
  }
}
