export async function loadOwnedAlbumOrThrow(user, albumId) {
  const album = await findAlbums("id", albumId);

  if (!album) {
    throw new Error("NOT_FOUND");
  }

  if (!user || (user.role !== "admin" && album.createdBy !== user.id)) {
    throw new Error("UNAUTHORIZED");
  }

  return album;
}

// Advanced multi-criteria filtering (AI + UI + combined filters)
export function filterAlbumsAdvanced(albums, criteria = {}) {
  let results = albums;

  // 1) moods: string[]
  if (criteria.moods?.length) {
    results = results.filter(album =>
      album.moods?.some(m => criteria.moods.includes(m))
    );
  }

  // 2) genre: string[]
  if (criteria.genre?.length) {
    results = results.filter(album =>
      criteria.genre.includes(album.genre)
    );
  }

  // 3) band: string
  if (criteria.band) {
    const bandLower = criteria.band.toLowerCase();
    results = results.filter(album =>
      album.band.toLowerCase() === bandLower
    );
  }

  // 4) era: derived from release_date
  if (criteria.era) {
    const [start, end] = eraToYears(criteria.era);
    results = results.filter(album => {
      const year = new Date(album.release_date).getFullYear();
      return year >= start && year < end;
    });
  }

  // 5) keywords: string[]
  if (criteria.keywords?.length) {
    const kwLower = criteria.keywords.map(k => k.toLowerCase());
    results = results.filter(album =>
      kwLower.some(kw =>
        album.title.toLowerCase().includes(kw) ||
        album.tracks.some(t => t.toLowerCase().includes(kw))
      )
    );
  }

  // 6) sorting
  if (criteria.sortBy) {
    results = sortAlbums(results, criteria.sortBy);
  }

  return results;
}

export function sortAlbums(albums, sortBy) {
  switch (sortBy) {
    case "year-asc":
      return albums.sort((a, b) => a.year - b.year);

    case "year-desc":
      return albums.sort((a, b) => b.year - a.year);

    case "title-asc":
      return albums.sort((a, b) => a.title.localeCompare(b.title));

    case "title-desc":
      return albums.sort((a, b) => b.title.localeCompare(a.title));

    default:
      return albums;
  }
}

export function handleAlbumErrors(err, res) {
  if (err.message === "NOT_FOUND") {
    return res.status(404).json({
      success: false,
      message: "Album not found!"
    });
  }

  if (err.message === "UNAUTHORIZED") {
    return res.status(403).json({
      success: false,
      message: "Unauthorized!"
    });
  }

  // Default fallback
  return res.status(400).json({
    success: false,
    message: "Invalid data!"
  });
}

export function eraToYears(era) {
  switch (era) {
    case "1970s": return [1970, 1980];
    case "1980s": return [1980, 1990];
    case "1990s": return [1990, 2000];
    case "2000s": return [2000, 2010];
    case "2010s": return [2010, 2020];
    default: return [0, 9999];
  }
}

