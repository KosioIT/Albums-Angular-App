export function createUser({ username, email, password }) {
  return {
    username,
    email,
    password, // hashed password
    favorites: [],
    likedAlbums: [],
    totalLikes: 0,
    token: null,
    resetCode: null,
    resetCodeExpiry: null,
    created_at: new Date().toISOString(),
  };
}
