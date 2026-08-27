export function createAlbum({ title, artist, year, genre, coverImageUrl }) {
  return {
    title,
    artist,
    year,
    genre,
    coverImageUrl,
    likes: 0,
    created_at: new Date().toISOString(),
  };
}