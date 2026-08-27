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
    this.token = data.token || null;

    // Reset code fields
    this.resetCode = data.resetCode || null;
    this.resetCodeExpiry = data.resetCodeExpiry || null;
    this.resetCodeStatus = data.resetCodeStatus || null;

    // Timestamps
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || null;
  }

  getFavorites() {
    return this.favorites;
  }

  /**
   * Add album to favorites
   */
  addFavorite(albumId) {
    if (!this.favorites.includes(albumId)) {
      this.favorites.push(albumId);
    }
  }

  /**
   * Remove album from favorites
   */
  removeFavorite(albumId) {
    this.favorites = this.favorites.filter(id => id !== albumId);
  }


  /**
   * Like album
   */
  likeAlbum(albumId) {
    if (!this.likedAlbums.includes(albumId)) {
      this.likedAlbums.push(albumId);
      this.totalLikes++;
    }
  }

  /**
   * Unlike album
   */
  unlikeAlbum(albumId) {
    if (this.likedAlbums.includes(albumId)) {
      this.likedAlbums = this.likedAlbums.filter(id => id !== albumId);
      this.totalLikes--;
    }
  }

  /**
   * Set reset code
   */
  setResetCode(hashedCode) {
    this.resetCode = hashedCode;
    this.resetCodeExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    this.resetCodeStatus = 'sent';
  }

  /**
   * Clear reset code
   */
  clearResetCode() {
    this.resetCode = null;
    this.resetCodeExpiry = null;
    this.resetCodeStatus = null;
  }

  /**
   * Set JWT token
   */
  setToken(token) {
    this.token = token;
  }

}
