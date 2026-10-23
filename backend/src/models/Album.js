import { BaseModel } from './BaseModel.js'; 
import  { makeSlug } from '../utils/slugify.js';

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

    // Optional fields
    this.rank = data.rank || 'common';
    this.likes = data.likes || 0;
    this.moods = data.moods || []; 
    this.producers = data.producers || [];

    // Tracks
    this.tracks = data.tracks || [];

    // Timestamps
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || null;

    //User (id) who created the album
    this.createdBy = data.createdBy || null;

    // MEGA Download URL
    this.megaUrl = data.megaUrl || null;
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
