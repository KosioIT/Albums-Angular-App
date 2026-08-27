export class Album extends BaseModel {
  constructor(data, id = null) {
    super(data, id);
    this.id = id;

    // Basic fields
    this.title = data.title;
    this.artist = data.artist;
    this.genre = data.genre;
    this.release_date = data.release_date;

    // Optional fields
    this.rank = data.rank || 'common';
    this.likes = data.likes || 0;
    this.producers = data.producers || [];

    // Tracks
    this.tracks = data.tracks || [];

    // Timestamps
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || null;
  }

  /**
   * Add a track
   */
  addTrack(track) {
    this.tracks.push(track);
    this.updated_at = new Date().toISOString();
  }

  /**
   * Remove a track by index
   */
  removeTrack(index) {
    if (index >= 0 && index < this.tracks.length) {
      this.tracks.splice(index, 1);
      this.updated_at = new Date().toISOString();
    }
  }

  addLike() {
    this.likes += 1;
    this.updated_at = new Date().toISOString();
  }

  removeLike() {
    if (this.likes > 0) {
      this.likes -= 1;
      this.updated_at = new Date().toISOString();
    }
  }
}
