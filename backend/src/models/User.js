import { BaseModel } from './BaseModel.js';

export class User extends BaseModel {
  constructor(data, id = null) {
    super(data, id);
    this.id = id;

    // Basic fields
    this.username = data.username;
    this.email = data.email;
    this.password = data.password; // hashed password

    // Album interactions
    this.favorites = data.favorites || [];
    this.likedAlbums = data.likedAlbums || [];
    this.totalLikes = data.totalLikes || 0;

    // Auth fields
    this.role = data.role || "user"; // user, admin, guest

    // Reset code fields
    this.resetCode = data.resetCode || null;
    this.resetCodeExpiry = data.resetCodeExpiry || null;
    this.resetCodeAttempts = data.resetCodeAttempts || 0;

    // Timestamps
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || null;
  }

  // Minimal user info for the client (login, refresh, /me)
  toBasic() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
      likedAlbums: this.likedAlbums, // the UI marks the albums the user already liked
    };
  }

  // Public representation without sensitive fields, plus simple stats
  toPublic() {
    const { password, resetCode, resetCodeExpiry, resetCodeAttempts, ...safe } = this;
    return {
      ...safe,
      stats: {
        favoritesCount: this.favorites.length,
        likedCount: this.likedAlbums.length,
      },
    };
  }

  getFavorites() {
    return this.favorites;
  }

  addFavorite(albumId) {
    if (!this.favorites.includes(albumId)) {
      this.favorites.push(albumId);
    }
  }

  removeFavorite(albumId) {
    this.favorites = this.favorites.filter(id => id !== albumId);
  }

  setResetCode(hashedCode) {
    this.resetCode = hashedCode;
    this.resetCodeExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
  }

  clearResetCode() {
    this.resetCode = null;
    this.resetCodeExpiry = null;
  }

}
