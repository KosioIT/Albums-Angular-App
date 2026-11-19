// The admin "Songs" page of an album (GET /api/albums/:id/songs)

export const COVER = 'cover';
export type SongTarget = number | typeof COVER; // a Deezer track id, or the album cover

export interface SongTrack {
  id: number; // Deezer track id
  title: string;
  duration: number;
  position: number;
  file: { name: string; size: number | null } | null; // the stored whole song, if any
}

export interface AlbumSongs {
  album: { id: string; title: string; artist: string; cover_img_url: string | null };
  tracks: SongTrack[];
  cover: { name: string; url: string } | null; // the cover packed into downloads
  limits: { audioBytes: number; imageBytes: number; files: number };
}

export interface SongUpload {
  name: string;
  target: SongTarget;
  key: string;
  url: string; // presigned PUT straight to R2
  contentType: string;
}
