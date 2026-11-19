import { PreviewTrack } from './preview-track';

export interface PlaylistTrack {
  albumId: string;
  trackId: number; // Deezer track id
  title: string;
  duration: number; // seconds
  albumTitle: string | null;
  artist: string | null;
  cover_img_url: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  ownerId: string;
  ownerName: string;
  trackCount: number;
  duration: number; // seconds, all tracks
  covers: string[]; // up to 4 album covers for the card
  created_at: string;
  updated_at: string;
  tracks?: PlaylistTrack[]; // only on GET /playlists/:id
}

export interface PlaylistPreviews {
  playlist: { id: string; name: string; ownerName: string };
  tracks: PreviewTrack[];
}
