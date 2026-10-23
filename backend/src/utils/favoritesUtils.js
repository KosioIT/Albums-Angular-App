import { checkExistingAlbum } from '../services/albumService.js';

export async function validateFavoriteOperation(user, albumId, operation) {
  // 1) Check if the album exists (in the database)
  const exists = await checkExistingAlbum(albumId);
  if (!exists) {
    return {
      ok: false,
      status: 404,
      message: 'Album not found!'
    };
  }

  const isFavorite = user.favorites.includes(albumId);

  // 2) Logic for adding
  if (operation === 'add' && isFavorite) {
    return {
      ok: false,
      status: 400,
      message: 'Album already in favorites!'
    };
  }

  // 3) Logic for removing
  if (operation === 'remove' && !isFavorite) {
    return {
      ok: false,
      status: 400,
      message: 'Album not in favorites!'
    };
  }

  // 4) All good
  return { ok: true };
}
