// A track in the player queue: the 30-second Deezer preview, plus the whole song for logged-in users
export interface PreviewTrack {
  id: number; // Deezer track id
  title: string;
  duration: number; // length of the full track in seconds
  preview: string; // 30-second Deezer preview
  fullUrl?: string; // the whole song, only for logged-in users when it is stored // mp3 link, expires after a while
  link: string; // the track on deezer.com
  // The album it belongs to (a playlist mixes albums)
  albumId?: string;
  albumTitle?: string | null;
  artist?: string | null;
  cover_img_url?: string | null;
}
