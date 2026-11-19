// A 30-second Deezer preview in the player queue
export interface PreviewTrack {
  id: number; // Deezer track id
  title: string;
  duration: number; // length of the full track in seconds
  preview: string; // mp3 link, expires after a while
  link: string; // the track on deezer.com
  // The album it belongs to (a playlist mixes albums)
  albumId?: string;
  albumTitle?: string | null;
  artist?: string | null;
  cover_img_url?: string | null;
}
