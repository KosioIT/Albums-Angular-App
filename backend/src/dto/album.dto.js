export function toAlbumDTO(album) {
  return {
    _id: album._id.toString(),
    title: album.title,
    artist: album.artist,
    release_date: album.release_date,
    producers: album.producers,
    genre: album.genre,
    cover_img_url: album.cover_img_url,
    rank: album.rank,
    tracks: album.tracks.map(track => ({
      title: track.title,
      duration: track.duration,
      composer: track.composer
    }))
  };
}
